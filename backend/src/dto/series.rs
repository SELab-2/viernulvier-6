use chrono::{DateTime, Utc};
use database::{
    Database,
    models::series::{SeriesCreate, SeriesTranslationData, SeriesWithTranslations},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SeriesTranslationPayload {
    pub language_code: String,
    pub name: String,
    pub subtitle: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SeriesPayload {
    pub id: Uuid,
    pub slug: String,
    pub translations: Vec<SeriesTranslationPayload>,
    pub production_ids: Vec<Uuid>,
    pub period_start: Option<DateTime<Utc>>,
    pub period_end: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SeriesPostPayload {
    pub slug: String,
    pub translations: Vec<SeriesTranslationPayload>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SeriesProductionsPayload {
    pub production_ids: Vec<Uuid>,
}

fn translations_to_data(translations: &[SeriesTranslationPayload]) -> Vec<SeriesTranslationData> {
    translations
        .iter()
        .map(|t| SeriesTranslationData {
            language_code: t.language_code.clone(),
            name: t.name.clone(),
            subtitle: t.subtitle.clone(),
            description: t.description.clone(),
        })
        .collect()
}

fn build_payload(
    swt: SeriesWithTranslations,
    production_ids: Vec<Uuid>,
    period_start: Option<DateTime<Utc>>,
    period_end: Option<DateTime<Utc>>,
) -> SeriesPayload {
    SeriesPayload {
        id: swt.series.id,
        slug: swt.series.slug,
        translations: swt
            .translations
            .into_iter()
            .map(|t| SeriesTranslationPayload {
                language_code: t.language_code,
                name: t.name,
                subtitle: t.subtitle,
                description: t.description,
            })
            .collect(),
        production_ids,
        period_start,
        period_end,
        created_at: swt.series.created_at,
        updated_at: swt.series.updated_at,
    }
}

impl SeriesPayload {
    pub async fn all(db: &Database) -> Result<Vec<Self>, AppError> {
        let all_series = db.series().all().await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.series.id).collect();
        let mut production_map = db.series().production_ids_for_many(&ids).await?;
        let mut period_map = db.series().derived_periods_for(&ids).await?;

        Ok(all_series
            .into_iter()
            .map(|swt| {
                let id = swt.series.id;
                let prod_ids = production_map.remove(&id).unwrap_or_default();
                let period = period_map.remove(&id);
                build_payload(
                    swt,
                    prod_ids,
                    period.as_ref().and_then(|p| p.period_start),
                    period.as_ref().and_then(|p| p.period_end),
                )
            })
            .collect())
    }

    pub async fn by_slug(db: &Database, slug: &str) -> Result<Self, AppError> {
        let swt = db.series().by_slug(slug).await?.ok_or(AppError::NotFound)?;

        let id = swt.series.id;
        let production_ids = db.series().production_ids_for(id).await?;
        let period_map = db.series().derived_periods_for(&[id]).await?;
        let period = period_map.get(&id);

        Ok(build_payload(
            swt,
            production_ids,
            period.and_then(|p| p.period_start),
            period.and_then(|p| p.period_end),
        ))
    }

    pub async fn for_production(db: &Database, production_id: Uuid) -> Result<Vec<Self>, AppError> {
        let all_series = db.series().series_for_production(production_id).await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.series.id).collect();
        let mut production_map = db.series().production_ids_for_many(&ids).await?;
        let mut period_map = db.series().derived_periods_for(&ids).await?;

        Ok(all_series
            .into_iter()
            .map(|swt| {
                let id = swt.series.id;
                let prod_ids = production_map.remove(&id).unwrap_or_default();
                let period = period_map.remove(&id);
                build_payload(
                    swt,
                    prod_ids,
                    period.as_ref().and_then(|p| p.period_start),
                    period.as_ref().and_then(|p| p.period_end),
                )
            })
            .collect())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        if db
            .series()
            .slug_exists_excluding(&self.slug, self.id)
            .await?
        {
            return Err(AppError::Conflict(format!(
                "slug '{}' is already taken",
                self.slug
            )));
        }

        let translations = translations_to_data(&self.translations);
        let swt = db
            .series()
            .update(self.id, SeriesCreate { slug: self.slug }, translations)
            .await?
            .ok_or(AppError::NotFound)?;

        let id = swt.series.id;
        let production_ids = db.series().production_ids_for(id).await?;
        let period_map = db.series().derived_periods_for(&[id]).await?;
        let period = period_map.get(&id);

        Ok(build_payload(
            swt,
            production_ids,
            period.and_then(|p| p.period_start),
            period.and_then(|p| p.period_end),
        ))
    }

    pub async fn delete(db: &Database, slug: &str) -> Result<(), AppError> {
        db.series()
            .delete_by_slug(slug)
            .await?
            .ok_or(AppError::NotFound)
    }
}

impl SeriesPostPayload {
    pub async fn create(self, db: &Database) -> Result<SeriesPayload, AppError> {
        if db.series().slug_exists(&self.slug).await? {
            return Err(AppError::Conflict(format!(
                "slug '{}' is already taken",
                self.slug
            )));
        }

        let translations = translations_to_data(&self.translations);
        let swt = db
            .series()
            .insert(SeriesCreate { slug: self.slug }, translations)
            .await?;
        Ok(build_payload(swt, vec![], None, None))
    }
}
