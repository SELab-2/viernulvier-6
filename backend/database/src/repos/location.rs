use std::collections::HashMap;

use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::location::{
        Location, LocationCreate, LocationTranslation, LocationTranslationData,
        LocationWithTranslations,
    },
};

pub struct LocationRepo<'a> {
    db: &'a PgPool,
}

impl<'a> LocationRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
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
        limit: usize,
        id_cursor: Option<Uuid>,
    ) -> Result<Vec<LocationWithTranslations>, DatabaseError> {
        let mut select = Location::select().limit(limit).order_desc("id");

        if let Some(id_cursor) = id_cursor {
            select = select.where_("id < $1").bind(id_cursor);
        }

        let locations = select.fetch_all(self.db).await?;

        if locations.is_empty() {
            return Ok(vec![]);
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

        Ok(locations
            .into_iter()
            .map(|l| {
                let translations = translation_map.remove(&l.id).unwrap_or_default();
                LocationWithTranslations {
                    location: l,
                    translations,
                }
            })
            .collect())
    }

    pub async fn insert(
        &self,
        location: LocationCreate,
        translations: Vec<LocationTranslationData>,
    ) -> Result<LocationWithTranslations, DatabaseError> {
        let location = location.insert(self.db).await?;
        self.upsert_translations(location.id, &translations)
            .await?;
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
        self.upsert_translations(location.id, &translations)
            .await?;
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
        let histories: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.history.as_deref())
            .collect();

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
