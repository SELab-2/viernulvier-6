use chrono::{DateTime, Utc};
use database::{
    Database,
    models::{
        entity_type::EntityType,
        series::{SeriesCreate, SeriesTranslationData, SeriesWithTranslations},
    },
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{dto::build_cover_url, error::AppError};

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
    /// Cover image URL resolved from the entity_media link (output-only).
    #[serde(default)]
    #[schema(read_only, nullable)]
    pub cover_image_url: Option<String>,
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
    cover_image_url: Option<String>,
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
        cover_image_url,
    }
}

impl SeriesPayload {
    pub async fn all(db: &Database, public_url: Option<&str>) -> Result<Vec<Self>, AppError> {
        let all_series = db.series().all().await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.series.id).collect();
        let mut production_map = db.series().production_ids_for_many(&ids).await?;
        let mut period_map = db.series().derived_periods_for(&ids).await?;

        let cover_keys = if public_url.is_some() {
            db.media()
                .cover_s3_keys_for_entities(EntityType::Series, &ids)
                .await?
        } else {
            Default::default()
        };

        Ok(all_series
            .into_iter()
            .map(|swt| {
                let id = swt.series.id;
                let prod_ids = production_map.remove(&id).unwrap_or_default();
                let period = period_map.remove(&id);
                let cover_image_url = public_url.and_then(|base| {
                    cover_keys
                        .get(&id)
                        .map(|key| build_cover_url(base, key))
                });

                build_payload(
                    swt,
                    prod_ids,
                    period.as_ref().and_then(|p| p.period_start),
                    period.as_ref().and_then(|p| p.period_end),
                    cover_image_url,
                )
            })
            .collect())
    }

    pub async fn by_slug(db: &Database, slug: &str, public_url: Option<&str>) -> Result<Self, AppError> {
        let swt = db.series().by_slug(slug).await?.ok_or(AppError::NotFound)?;

        let id = swt.series.id;
        let production_ids = db.series().production_ids_for(id).await?;
        let period_map = db.series().derived_periods_for(&[id]).await?;
        let period = period_map.get(&id);

        let cover_image_url = if let Some(base) = public_url {
            let cover_keys = db
                .media()
                .cover_s3_keys_for_entities(EntityType::Series, &[id])
                .await?;
            cover_keys.get(&id).map(|key| build_cover_url(base, key))
        } else {
            None
        };

        Ok(build_payload(
            swt,
            production_ids,
            period.and_then(|p| p.period_start),
            period.and_then(|p| p.period_end),
            cover_image_url,
        ))
    }

    pub async fn for_production(db: &Database, production_id: Uuid, public_url: Option<&str>) -> Result<Vec<Self>, AppError> {
        let all_series = db.series().series_for_production(production_id).await?;

        if all_series.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = all_series.iter().map(|s| s.series.id).collect();
        let mut production_map = db.series().production_ids_for_many(&ids).await?;
        let mut period_map = db.series().derived_periods_for(&ids).await?;

        let cover_keys = if public_url.is_some() {
            db.media()
                .cover_s3_keys_for_entities(EntityType::Series, &ids)
                .await?
        } else {
            Default::default()
        };

        Ok(all_series
            .into_iter()
            .map(|swt| {
                let id = swt.series.id;
                let prod_ids = production_map.remove(&id).unwrap_or_default();
                let period = period_map.remove(&id);
                let cover_image_url = public_url.and_then(|base| {
                    cover_keys
                        .get(&id)
                        .map(|key| build_cover_url(base, key))
                });

                build_payload(
                    swt,
                    prod_ids,
                    period.as_ref().and_then(|p| p.period_start),
                    period.as_ref().and_then(|p| p.period_end),
                    cover_image_url,
                )
            })
            .collect())
    }

    pub async fn update(self, db: &Database, public_url: Option<&str>) -> Result<Self, AppError> {
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

        let cover_image_url = if let Some(base) = public_url {
            let cover_keys = db
                .media()
                .cover_s3_keys_for_entities(EntityType::Series, &[id])
                .await?;
            cover_keys.get(&id).map(|key| build_cover_url(base, key))
        } else {
            None
        };

        Ok(build_payload(
            swt,
            production_ids,
            period.and_then(|p| p.period_start),
            period.and_then(|p| p.period_end),
            cover_image_url,
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
        Ok(build_payload(swt, vec![], None, None, None))
    }
}
