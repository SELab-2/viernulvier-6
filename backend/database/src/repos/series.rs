use std::collections::HashMap;

use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::series::{
        Series, SeriesCreate, SeriesDerivedPeriod, SeriesTranslation, SeriesTranslationData,
        SeriesWithTranslations,
    },
};

#[derive(FromRow)]
struct SeriesProductionRow {
    series_id: Uuid,
    production_id: Uuid,
}

pub struct SeriesRepo<'a> {
    db: &'a PgPool,
}

impl<'a> SeriesRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn all(&self) -> Result<Vec<SeriesWithTranslations>, DatabaseError> {
        let all_series =
            sqlx::query_as::<_, Series>("SELECT * FROM series ORDER BY created_at DESC")
                .fetch_all(self.db)
                .await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.id).collect();
        let all_translations = sqlx::query_as::<_, SeriesTranslation>(
            "SELECT * FROM series_translations WHERE series_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<SeriesTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.series_id).or_default().push(t);
        }

        Ok(all_series
            .into_iter()
            .map(|s| {
                let translations = translation_map.remove(&s.id).unwrap_or_default();
                SeriesWithTranslations {
                    series: s,
                    translations,
                }
            })
            .collect())
    }

    pub async fn by_slug(
        &self,
        slug: &str,
    ) -> Result<Option<SeriesWithTranslations>, DatabaseError> {
        let Some(series) =
            sqlx::query_as::<_, Series>("SELECT * FROM series WHERE slug = $1")
                .bind(slug)
                .fetch_optional(self.db)
                .await?
        else {
            return Ok(None);
        };

        let translations = self.fetch_translations_for(series.id).await?;

        Ok(Some(SeriesWithTranslations {
            series,
            translations,
        }))
    }

    pub async fn insert(
        &self,
        data: SeriesCreate,
        translations: Vec<SeriesTranslationData>,
    ) -> Result<SeriesWithTranslations, DatabaseError> {
        let series =
            sqlx::query_as::<_, Series>("INSERT INTO series (slug) VALUES ($1) RETURNING *")
                .bind(data.slug)
                .fetch_one(self.db)
                .await?;

        self.upsert_translations(series.id, &translations).await?;
        let translations = self.fetch_translations_for(series.id).await?;

        Ok(SeriesWithTranslations {
            series,
            translations,
        })
    }

    pub async fn update(
        &self,
        id: Uuid,
        data: SeriesCreate,
        translations: Vec<SeriesTranslationData>,
    ) -> Result<Option<SeriesWithTranslations>, DatabaseError> {
        let Some(series) = sqlx::query_as::<_, Series>(
            "UPDATE series SET slug = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        )
        .bind(id)
        .bind(data.slug)
        .fetch_optional(self.db)
        .await?
        else {
            return Ok(None);
        };

        self.upsert_translations(series.id, &translations).await?;
        let translations = self.fetch_translations_for(series.id).await?;

        Ok(Some(SeriesWithTranslations {
            series,
            translations,
        }))
    }

    pub async fn slug_exists(&self, slug: &str) -> Result<bool, DatabaseError> {
        Ok(
            sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM series WHERE slug = $1)")
                .bind(slug)
                .fetch_one(self.db)
                .await?,
        )
    }

    pub async fn slug_exists_excluding(
        &self,
        slug: &str,
        exclude_id: Uuid,
    ) -> Result<bool, DatabaseError> {
        Ok(sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM series WHERE slug = $1 AND id != $2)",
        )
        .bind(slug)
        .bind(exclude_id)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn delete_by_slug(&self, slug: &str) -> Result<Option<()>, DatabaseError> {
        let res = sqlx::query("DELETE FROM series WHERE slug = $1")
            .bind(slug)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Ok(None);
        }

        Ok(Some(()))
    }

    pub async fn production_ids_for(
        &self,
        series_id: Uuid,
    ) -> Result<Vec<Uuid>, DatabaseError> {
        let ids = sqlx::query_scalar::<_, Uuid>(
            "SELECT production_id FROM series_productions WHERE series_id = $1",
        )
        .bind(series_id)
        .fetch_all(self.db)
        .await?;

        Ok(ids)
    }

    pub async fn production_ids_for_many(
        &self,
        series_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<Uuid>>, DatabaseError> {
        let rows = sqlx::query_as::<_, SeriesProductionRow>(
            "SELECT series_id, production_id FROM series_productions WHERE series_id = ANY($1)",
        )
        .bind(series_ids)
        .fetch_all(self.db)
        .await?;

        let mut map: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in rows {
            map.entry(row.series_id)
                .or_default()
                .push(row.production_id);
        }

        Ok(map)
    }

    pub async fn series_for_production(
        &self,
        production_id: Uuid,
    ) -> Result<Vec<SeriesWithTranslations>, DatabaseError> {
        let all_series = sqlx::query_as::<_, Series>(
            "SELECT s.* FROM series s
             JOIN series_productions sp ON sp.series_id = s.id
             WHERE sp.production_id = $1
             ORDER BY s.created_at DESC",
        )
        .bind(production_id)
        .fetch_all(self.db)
        .await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.id).collect();
        let all_translations = sqlx::query_as::<_, SeriesTranslation>(
            "SELECT * FROM series_translations WHERE series_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<SeriesTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.series_id).or_default().push(t);
        }

        Ok(all_series
            .into_iter()
            .map(|s| {
                let translations = translation_map.remove(&s.id).unwrap_or_default();
                SeriesWithTranslations {
                    series: s,
                    translations,
                }
            })
            .collect())
    }

    pub async fn add_productions(
        &self,
        series_id: Uuid,
        production_ids: &[Uuid],
    ) -> Result<(), DatabaseError> {
        if production_ids.is_empty() {
            return Ok(());
        }

        let found_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM productions WHERE id = ANY($1)",
        )
        .bind(production_ids)
        .fetch_one(self.db)
        .await?;

        if found_count != production_ids.len() as i64 {
            return Err(DatabaseError::BadRequest(
                "One or more production IDs do not exist".to_string(),
            ));
        }

        let series_ids_repeated: Vec<Uuid> = vec![series_id; production_ids.len()];

        sqlx::query(
            "INSERT INTO series_productions (series_id, production_id)
             SELECT * FROM UNNEST($1::uuid[], $2::uuid[])
             ON CONFLICT DO NOTHING",
        )
        .bind(&series_ids_repeated[..])
        .bind(production_ids)
        .execute(self.db)
        .await?;

        Ok(())
    }

    pub async fn remove_production(
        &self,
        series_id: Uuid,
        production_id: Uuid,
    ) -> Result<Option<()>, DatabaseError> {
        let res = sqlx::query(
            "DELETE FROM series_productions WHERE series_id = $1 AND production_id = $2",
        )
        .bind(series_id)
        .bind(production_id)
        .execute(self.db)
        .await?;

        if res.rows_affected() == 0 {
            return Ok(None);
        }

        Ok(Some(()))
    }

    pub async fn derived_periods_for(
        &self,
        series_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, SeriesDerivedPeriod>, DatabaseError> {
        let periods = sqlx::query_as::<_, SeriesDerivedPeriod>(
            "SELECT sp.series_id,
                    MIN(e.starts_at) AS period_start,
                    MAX(COALESCE(e.ends_at, e.starts_at)) AS period_end
             FROM series_productions sp
             JOIN events e ON e.production_id = sp.production_id
             WHERE sp.series_id = ANY($1)
             GROUP BY sp.series_id",
        )
        .bind(series_ids)
        .fetch_all(self.db)
        .await?;

        Ok(periods.into_iter().map(|p| (p.series_id, p)).collect())
    }

    async fn fetch_translations_for(
        &self,
        series_id: Uuid,
    ) -> Result<Vec<SeriesTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, SeriesTranslation>(
            "SELECT * FROM series_translations WHERE series_id = $1",
        )
        .bind(series_id)
        .fetch_all(self.db)
        .await?)
    }

    async fn upsert_translations(
        &self,
        series_id: Uuid,
        translations: &[SeriesTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let names: Vec<&str> = translations.iter().map(|t| t.name.as_str()).collect();
        let subtitles: Vec<&str> = translations
            .iter()
            .map(|t| t.subtitle.as_str())
            .collect();
        let descriptions: Vec<&str> = translations
            .iter()
            .map(|t| t.description.as_str())
            .collect();

        sqlx::query(
            "INSERT INTO series_translations (series_id, language_code, name, subtitle, description)
             SELECT $1, * FROM UNNEST($2::text[], $3::text[], $4::text[], $5::text[])
             ON CONFLICT (series_id, language_code) DO UPDATE SET
                 name        = EXCLUDED.name,
                 subtitle    = EXCLUDED.subtitle,
                 description = EXCLUDED.description",
        )
        .bind(series_id)
        .bind(&language_codes[..])
        .bind(&names[..])
        .bind(&subtitles[..])
        .bind(&descriptions[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}
