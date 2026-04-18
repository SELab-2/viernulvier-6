use std::collections::HashMap;

use ormlite::Model;
use sqlx::PgPool;
use tracing::debug;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        filtering::cursor::CursorData,
        location::{
            Location, LocationCreate, LocationSearch, LocationTranslation, LocationTranslationData,
            LocationWithScore, LocationWithTranslations,
        },
    },
};

pub struct LocationRepo<'a> {
    db: &'a PgPool,
}

impl<'a> LocationRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn count(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM locations")
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }

    pub async fn by_id(&self, id: Uuid) -> Result<LocationWithTranslations, DatabaseError> {
        let location = Location::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)?;

        let translations = self.fetch_translations_for(location.id).await?;

        Ok(LocationWithTranslations {
            location,
            translations,
        })
    }

    pub async fn by_slug(&self, slug: &str) -> Result<LocationWithTranslations, DatabaseError> {
        let location = Location::select()
            .where_("slug = $1")
            .bind(slug)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)?;

        let translations = self.fetch_translations_for(location.id).await?;

        Ok(LocationWithTranslations {
            location,
            translations,
        })
    }

    pub async fn all(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        search: LocationSearch,
    ) -> Result<(Vec<LocationWithTranslations>, Option<CursorData>), DatabaseError> {
        let limit: i64 = (limit + 1).into();

        let (locations, next_cursor): (Vec<Location>, Option<CursorData>) =
            if let Some(search_q) = search.q {
                debug!("querying locations with search: '{search_q}'");

                let mut query = sqlx::QueryBuilder::new("SELECT l.*, ");
                query
                    .push_bind(&search_q)
                    .push(" <<-> full_search_text AS distance_score ")
                    .push("FROM locations l ")
                    .push("WHERE ")
                    .push_bind(&search_q)
                    .push(" <% full_search_text ");

                // use the cursor if there is one
                if let Some(cursor) = cursor
                    && let Some(score) = cursor.score
                {
                    // distance_score > cursor.score
                    query
                        .push("AND ((")
                        .push_bind(&search_q)
                        .push(" <<-> full_search_text) > ")
                        .push_bind(score);

                    // OR (distance_score = cursor.score AND id < cursor.id)
                    query
                        .push(" OR ((")
                        .push_bind(&search_q)
                        .push(" <<-> full_search_text) = ")
                        .push_bind(score)
                        .push(" AND id < ")
                        .push_bind(cursor.id)
                        .push(")) ");
                }

                query
                    .push("ORDER BY distance_score ASC, id DESC LIMIT ")
                    .push_bind(limit);

                debug!("locations query: {}", query.sql());

                let mut locations_with_score: Vec<LocationWithScore> =
                    query.build_query_as().fetch_all(self.db).await?;

                // calculate the next cursor if there are items on the next page
                let next_cursor = if locations_with_score.len() == limit as usize {
                    locations_with_score.pop();
                    locations_with_score.last().map(|l| CursorData {
                        id: l.location.id,
                        score: Some(l.distance_score),
                    })
                } else {
                    None
                };

                let locations = locations_with_score
                    .into_iter()
                    .map(|l| l.location)
                    .collect();

                (locations, next_cursor)
            } else {
                debug!("querying locations normally");

                let mut select = Location::select().limit(limit as usize).order_desc("id");

                if let Some(cursor) = cursor {
                    select = select.where_("id < $1").bind(cursor.id);
                }

                let mut locations = select.fetch_all(self.db).await?;

                let next_cursor = if locations.len() == limit as usize {
                    locations.pop();
                    locations.last().map(|l| CursorData {
                        id: l.id,
                        score: None,
                    })
                } else {
                    None
                };

                (locations, next_cursor)
            };

        if locations.is_empty() {
            return Ok((vec![], next_cursor));
        }

        let ids: Vec<Uuid> = locations.iter().map(|l| l.id).collect();
        let all_translations = sqlx::query_as::<_, LocationTranslation>(
            "SELECT * FROM location_translations WHERE location_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<LocationTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.location_id).or_default().push(t);
        }

        let locations = locations
            .into_iter()
            .map(|l| {
                let translations = translation_map.remove(&l.id).unwrap_or_default();
                LocationWithTranslations {
                    location: l,
                    translations,
                }
            })
            .collect();

        Ok((locations, next_cursor))
    }

    pub async fn insert(
        &self,
        location: LocationCreate,
        translations: Vec<LocationTranslationData>,
    ) -> Result<LocationWithTranslations, DatabaseError> {
        let location = sqlx::query_as::<_, Location>(
            "INSERT INTO locations (source_id, name, code, street, number, postal_code, city, country, phone_1, phone_2, is_owned_by_viernulvier, uitdatabank_id, slug)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (source_id) DO UPDATE SET
                 name                    = EXCLUDED.name,
                 code                    = EXCLUDED.code,
                 street                  = EXCLUDED.street,
                 number                  = EXCLUDED.number,
                 postal_code             = EXCLUDED.postal_code,
                 city                    = EXCLUDED.city,
                 country                 = EXCLUDED.country,
                 phone_1                 = EXCLUDED.phone_1,
                 phone_2                 = EXCLUDED.phone_2,
                 is_owned_by_viernulvier = EXCLUDED.is_owned_by_viernulvier,
                 uitdatabank_id          = EXCLUDED.uitdatabank_id,
                 slug                    = EXCLUDED.slug
             RETURNING *",
        )
        .bind(location.source_id)
        .bind(&location.name)
        .bind(&location.code)
        .bind(&location.street)
        .bind(&location.number)
        .bind(&location.postal_code)
        .bind(&location.city)
        .bind(&location.country)
        .bind(&location.phone_1)
        .bind(&location.phone_2)
        .bind(location.is_owned_by_viernulvier)
        .bind(&location.uitdatabank_id)
        .bind(&location.slug)
        .fetch_one(self.db)
        .await?;
        self.upsert_translations(location.id, &translations).await?;
        let translation_rows = self.fetch_translations_for(location.id).await?;

        Ok(LocationWithTranslations {
            location,
            translations: translation_rows,
        })
    }

    pub async fn by_source_id(
        &self,
        source_id: i32,
    ) -> Result<Option<LocationWithTranslations>, DatabaseError> {
        let Some(location) = Location::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?
        else {
            return Ok(None);
        };

        let translations = self.fetch_translations_for(location.id).await?;

        Ok(Some(LocationWithTranslations {
            location,
            translations,
        }))
    }

    pub async fn update(
        &self,
        location: Location,
        translations: Vec<LocationTranslationData>,
    ) -> Result<LocationWithTranslations, DatabaseError> {
        let location = location.update_all_fields(self.db).await?;
        self.upsert_translations(location.id, &translations).await?;
        let translation_rows = self.fetch_translations_for(location.id).await?;

        Ok(LocationWithTranslations {
            location,
            translations: translation_rows,
        })
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM locations WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    async fn fetch_translations_for(
        &self,
        location_id: Uuid,
    ) -> Result<Vec<LocationTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, LocationTranslation>(
            "SELECT * FROM location_translations WHERE location_id = $1",
        )
        .bind(location_id)
        .fetch_all(self.db)
        .await?)
    }

    /// Insert or update translations for a location. Clears all translations when the list is empty.
    async fn upsert_translations(
        &self,
        location_id: Uuid,
        translations: &[LocationTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            sqlx::query("DELETE FROM location_translations WHERE location_id = $1")
                .bind(location_id)
                .execute(self.db)
                .await?;
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let descriptions: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description.as_deref())
            .collect();
        let histories: Vec<Option<&str>> =
            translations.iter().map(|t| t.history.as_deref()).collect();

        sqlx::query(
            "INSERT INTO location_translations (
                location_id, language_code,
                description, history
            )
            SELECT $1, * FROM UNNEST(
                $2::text[], $3::text[], $4::text[]
            )
            ON CONFLICT (location_id, language_code) DO UPDATE SET
                description = EXCLUDED.description,
                history     = EXCLUDED.history",
        )
        .bind(location_id)
        .bind(&language_codes[..])
        .bind(&descriptions[..])
        .bind(&histories[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}
