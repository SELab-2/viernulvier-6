use std::collections::HashMap;

use ormlite::{Insert, Model};
use sqlx::{PgPool, Postgres, QueryBuilder};
use tracing::debug;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        entity_type::EntityType,
        filtering::{cursor::CursorData, sort::Sort},
        production::{
            Production, ProductionCreate, ProductionFilters, ProductionTranslation,
            ProductionTranslationData, ProductionWithScore, ProductionWithTranslations,
        },
    },
    repos::query_filters::facets::AddFacetFilters,
};

pub struct ProductionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ProductionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn count(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM productions")
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }

    pub async fn by_id(&self, id: Uuid) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = Production::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)?;

        let translations = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations,
        })
    }

    pub async fn all(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        filters: ProductionFilters,
    ) -> Result<(Vec<ProductionWithTranslations>, Option<CursorData>), DatabaseError> {
        // make the limit 1 higher to check for next pages
        let limit: i64 = (limit + 1).into();

        let (productions, next_cursor): (Vec<Production>, Option<CursorData>) =
            if let Some(ref search_q) = filters.search {
                debug!("querying productions with search: '{search_q}'");
                self.all_search(limit, cursor, search_q, &filters).await?
            } else {
                debug!("querying productions normally");
                self.all_normal(limit, cursor, &filters).await?
            };

        if productions.is_empty() {
            return Ok((vec![], None));
        }

        // get all translations
        let ids: Vec<Uuid> = productions.iter().map(|p| p.id).collect();
        let all_translations = sqlx::query_as::<_, ProductionTranslation>(
            "SELECT * FROM production_translations WHERE production_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        // map translations to it's production
        let mut translation_map: HashMap<Uuid, Vec<ProductionTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.production_id).or_default().push(t);
        }

        let productions_with_translations = productions
            .into_iter()
            .map(|p| {
                let translations = translation_map.remove(&p.id).unwrap_or_default();
                ProductionWithTranslations {
                    production: p,
                    translations,
                }
            })
            .collect();

        Ok((productions_with_translations, next_cursor))
    }

    /// returns all production id's of productions matching the given filters
    ///
    /// to be used when there is a search query present
    async fn all_search(
        &self,
        limit: i64,
        cursor: Option<CursorData>,
        search_q: &str,
        filters: &ProductionFilters,
    ) -> Result<(Vec<Production>, Option<CursorData>), DatabaseError> {
        let mut query = sqlx::QueryBuilder::new("WITH matched_translations AS (");
        query
            .push("SELECT production_id, MIN( ")
            .push_bind(search_q)
            .push(" <<-> full_search_text) ")
            .push(" as distance_score ") // lower is better
            .push(" FROM production_translations ")
            .push(" WHERE ")
            .push_bind(search_q)
            .push(" <% full_search_text ")
            .apply_facet_filters(EntityType::Production, "production_id", &filters.facets);

        if filters.date_from.is_some() || filters.date_to.is_some() {
            query
                .push(" AND EXISTS (SELECT 1 FROM events ")
                .push(" WHERE events.production_id = production_id ");

            if let Some(date_from) = filters.date_from {
                query.push(" AND starts_at >= ").push_bind(date_from);
            }

            if let Some(date_to) = filters.date_to {
                query.push(" AND starts_at <= ").push_bind(date_to);
            }

            query.push(" ) ");
        }

        if let Some(ref cursor) = cursor {
            match filters.sort {
                Sort::Oldest => {
                    query.push(" AND production_id > ").push_bind(cursor.id);
                }
                Sort::Recent => {
                    query.push(" AND production_id < ").push_bind(cursor.id);
                }
                Sort::Relevance => {} // explicitly do nothing
            };
        }

        query.push(" GROUP BY production_id ");

        if let Some(ref cursor) = cursor {
            match filters.sort {
                Sort::Oldest | Sort::Recent => {}
                Sort::Relevance => {
                    if let Some(score) = cursor.score {
                        // HAVING score > cursor.score
                        query.push(" HAVING MIN( ");
                        query.push_bind(search_q);
                        query.push(" <<-> full_search_text) > ");
                        query.push_bind(score);

                        // OR (score = cursor.score AND id < cursor.id)
                        query.push(" OR (MIN( ");
                        query.push_bind(search_q);
                        query.push(" <<-> full_search_text) = ");
                        query.push_bind(score);
                        query.push(" AND production_id < ");
                        query.push_bind(cursor.id);
                        query.push(") ");
                    }
                }
            }
        }

        let sort_sql = match filters.sort {
            Sort::Oldest => "production_id ASC",
            Sort::Recent => "production_id DESC",
            Sort::Relevance => "distance_score ASC, production_id DESC",
        };

        query.push(format_args!(" ORDER BY {sort_sql}"));
        query.push(" LIMIT ").push_bind(limit).push(" ) ");
        // END CTE

        // the rest of the query using the CTE
        query
            .push(" SELECT p.*, distance_score ")
            .push(" FROM productions p ")
            .push(" INNER JOIN matched_translations m ON p.id = m.production_id")
            .push(format_args!(" ORDER BY {sort_sql}"));

        debug!("productions query: {}", query.sql());

        let mut productions_with_score: Vec<ProductionWithScore> =
            query.build_query_as().fetch_all(self.db).await?;

        // calculate the next cursor if there are items on the next page
        let next_cursor = if productions_with_score.len() == limit as usize {
            productions_with_score.pop();
            productions_with_score.last().map(|p| CursorData {
                id: p.production.id,
                score: Some(p.distance_score),
            })
        } else {
            None
        };

        let productions = productions_with_score
            .into_iter()
            .map(|p| p.production)
            .collect();

        Ok((productions, next_cursor))
    }

    /// returns all production id's of productions matching the given filters
    ///
    /// to be used when there is **NO** search query present
    async fn all_normal(
        &self,
        limit: i64,
        cursor: Option<CursorData>,
        filters: &ProductionFilters,
    ) -> Result<(Vec<Production>, Option<CursorData>), DatabaseError> {
        let (cursor_cmp, order_direction) = match filters.sort {
            Sort::Oldest => (">", "ASC"),
            Sort::Recent | Sort::Relevance => ("<", "DESC"),
        };

        let mut query = QueryBuilder::new("SELECT * FROM PRODUCTIONS WHERE 1=1 ");

        // cursor
        if let Some(cursor) = cursor {
            query
                .push(format_args!(" AND id {cursor_cmp} ")) // > or <
                .push_bind(cursor.id);
        }

        // facet filters
        query.apply_facet_filters(EntityType::Production, "id", &filters.facets);

        // date filters
        apply_date_filters(&mut query, filters);

        query
            .push(format_args!(" ORDER BY id {order_direction} LIMIT "))
            .push_bind(limit);

        let mut productions: Vec<Production> = query.build_query_as().fetch_all(self.db).await?;

        // find the next cursor if there is one
        let next_cursor = if productions.len() == limit as usize {
            productions.pop();
            productions.last().map(|p| CursorData {
                id: p.id,
                score: None,
            })
        } else {
            None
        };

        Ok((productions, next_cursor))
    }

    pub async fn insert(
        &self,
        production: ProductionCreate,
        translations: Vec<ProductionTranslationData>,
    ) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = production.insert(self.db).await?;
        self.upsert_translations(production.id, &translations)
            .await?;
        let translation_rows = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations: translation_rows,
        })
    }

    pub async fn update(
        &self,
        production: Production,
        translations: Vec<ProductionTranslationData>,
    ) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = production.update_all_fields(self.db).await?;
        self.upsert_translations(production.id, &translations)
            .await?;
        let translation_rows = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations: translation_rows,
        })
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM productions WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn by_source_id(
        &self,
        source_id: i32,
    ) -> Result<Option<ProductionWithTranslations>, DatabaseError> {
        let Some(production) = Production::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?
        else {
            return Ok(None);
        };

        let translations = self.fetch_translations_for(production.id).await?;

        Ok(Some(ProductionWithTranslations {
            production,
            translations,
        }))
    }

    async fn fetch_translations_for(
        &self,
        production_id: Uuid,
    ) -> Result<Vec<ProductionTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, ProductionTranslation>(
            "SELECT * FROM production_translations WHERE production_id = $1",
        )
        .bind(production_id)
        .fetch_all(self.db)
        .await?)
    }

    /// Insert or update translations for a production. Clears all translations when the list is empty.
    async fn upsert_translations(
        &self,
        production_id: Uuid,
        translations: &[ProductionTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            sqlx::query("DELETE FROM production_translations WHERE production_id = $1")
                .bind(production_id)
                .execute(self.db)
                .await?;
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let supertitles: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.supertitle.as_deref())
            .collect();
        let titles: Vec<Option<&str>> = translations.iter().map(|t| t.title.as_deref()).collect();
        let artists: Vec<Option<&str>> = translations.iter().map(|t| t.artist.as_deref()).collect();
        let meta_titles: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.meta_title.as_deref())
            .collect();
        let meta_descriptions: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.meta_description.as_deref())
            .collect();
        let taglines: Vec<Option<&str>> =
            translations.iter().map(|t| t.tagline.as_deref()).collect();
        let teasers: Vec<Option<&str>> = translations.iter().map(|t| t.teaser.as_deref()).collect();
        let descriptions: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description.as_deref())
            .collect();
        let description_extras: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_extra.as_deref())
            .collect();
        let description_2s: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_2.as_deref())
            .collect();
        let quotes: Vec<Option<&str>> = translations.iter().map(|t| t.quote.as_deref()).collect();
        let quote_sources: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.quote_source.as_deref())
            .collect();
        let programmes: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.programme.as_deref())
            .collect();
        let infos: Vec<Option<&str>> = translations.iter().map(|t| t.info.as_deref()).collect();
        let description_shorts: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_short.as_deref())
            .collect();

        sqlx::query(
            "INSERT INTO production_translations (
                production_id, language_code,
                supertitle, title, artist, meta_title, meta_description,
                tagline, teaser, description, description_extra, description_2,
                quote, quote_source, programme, info, description_short
            )
            SELECT $1, * FROM UNNEST(
                $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                $7::text[], $8::text[], $9::text[], $10::text[], $11::text[],
                $12::text[], $13::text[], $14::text[], $15::text[], $16::text[],
                $17::text[]
            )
            ON CONFLICT (production_id, language_code) DO UPDATE SET
                supertitle        = EXCLUDED.supertitle,
                title             = EXCLUDED.title,
                artist            = EXCLUDED.artist,
                meta_title        = EXCLUDED.meta_title,
                meta_description  = EXCLUDED.meta_description,
                tagline           = EXCLUDED.tagline,
                teaser            = EXCLUDED.teaser,
                description       = EXCLUDED.description,
                description_extra = EXCLUDED.description_extra,
                description_2     = EXCLUDED.description_2,
                quote             = EXCLUDED.quote,
                quote_source      = EXCLUDED.quote_source,
                programme         = EXCLUDED.programme,
                info              = EXCLUDED.info,
                description_short = EXCLUDED.description_short",
        )
        .bind(production_id)
        .bind(&language_codes[..])
        .bind(&supertitles[..])
        .bind(&titles[..])
        .bind(&artists[..])
        .bind(&meta_titles[..])
        .bind(&meta_descriptions[..])
        .bind(&taglines[..])
        .bind(&teasers[..])
        .bind(&descriptions[..])
        .bind(&description_extras[..])
        .bind(&description_2s[..])
        .bind(&quotes[..])
        .bind(&quote_sources[..])
        .bind(&programmes[..])
        .bind(&infos[..])
        .bind(&description_shorts[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}

fn apply_date_filters(query: &mut QueryBuilder<Postgres>, filters: &ProductionFilters) {
    if filters.date_from.is_some() || filters.date_to.is_some() {
        query
            .push(" AND EXISTS (SELECT 1 FROM events ")
            .push(" WHERE events.production_id = production_id ");

        if let Some(date_from) = filters.date_from {
            query.push(" AND starts_at >= ").push_bind(date_from);
        }

        if let Some(date_to) = filters.date_to {
            query.push(" AND starts_at <= ").push_bind(date_to);
        }

        query.push(" ) ");
    }
}
