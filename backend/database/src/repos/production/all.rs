use std::collections::HashMap;

use sqlx::{Postgres, QueryBuilder};
use tracing::debug;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        entity_type::EntityType,
        filtering::{cursor::CursorData, sort::Sort},
        production::{
            Production, ProductionFilters, ProductionTranslation, ProductionWithScore,
            ProductionWithTranslations,
        },
    },
    repos::{production::ProductionRepo, query_filters::facets::AddFacetFilters},
};

impl<'a> ProductionRepo<'a> {
    /// return all productions
    ///
    /// supports filtering and paging using a cursor
    pub async fn all(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        filters: ProductionFilters,
    ) -> Result<(Vec<ProductionWithTranslations>, Option<CursorData>), DatabaseError> {
        // make the limit 1 higher to check if there is a following page
        // used to determine if we send a cursor
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
            .push(" <% full_search_text ") // only keep items that matched a minimum amount
            .apply_facet_filters(EntityType::Production, "production_id", &filters.facets);

        apply_date_filters(&mut query, filters);

        if let Some(ref cursor) = cursor {
            match filters.sort {
                Sort::Oldest => {
                    query.push(" AND production_id > ").push_bind(cursor.id);
                }
                Sort::Recent => {
                    query.push(" AND production_id < ").push_bind(cursor.id);
                }
                Sort::Relevance => {} // explicitly do nothing, handled after GROUP BY
            };
        }

        query.push(" GROUP BY production_id ");

        // if the sort is relevance, we need to use the score component of the cursor
        if let Some(ref cursor) = cursor
            && let Some(score) = cursor.score
        {
            match filters.sort {
                Sort::Oldest | Sort::Recent => {}
                Sort::Relevance => {
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

        let sort_sql = match filters.sort {
            Sort::Oldest => "production_id ASC",
            Sort::Recent => "production_id DESC",
            Sort::Relevance => "distance_score ASC, production_id DESC",
        };

        query.push(format_args!(" ORDER BY {sort_sql} "));
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
