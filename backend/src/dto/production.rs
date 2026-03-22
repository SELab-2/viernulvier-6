use database::{
    Database,
    models::production::{Production, ProductionCreate},
};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

impl ProductionPayload {
    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Self>, AppError> {
        Ok(db
            .productions()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.productions().by_id(id).await?.into())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.productions().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.productions().delete(id).await?)
    }
}

impl ProductionPostPayload {
    pub async fn create(self, db: &Database) -> Result<ProductionPayload, AppError> {
        Ok(db.productions().insert(self.into()).await?.into())
    }
}

fn compute_metadata_status(p: &Production) -> String {
    let is_complete = p.title_nl.is_some()
        && p.title_en.is_some()
        && p.artist_nl.is_some()
        && p.artist_en.is_some()
        && p.tagline_nl.is_some()
        && p.tagline_en.is_some()
        && p.description_nl.is_some()
        && p.description_en.is_some();
    if is_complete {
        "complete".to_string()
    } else {
        "partial".to_string()
    }
}

/// DTO for production responses. All fields mirror the database model except
/// `metadata_status`, which is computed and read-only (never persisted).
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProductionPayload {
    pub id: Uuid,

    pub source_id: Option<i32>,
    pub slug: String,

    pub supertitle_nl: Option<String>,
    pub supertitle_en: Option<String>,
    pub title_nl: Option<String>,
    pub title_en: Option<String>,
    pub artist_nl: Option<String>,
    pub artist_en: Option<String>,
    pub meta_title_nl: Option<String>,
    pub meta_title_en: Option<String>,
    pub meta_description_nl: Option<String>,
    pub meta_description_en: Option<String>,
    pub tagline_nl: Option<String>,
    pub tagline_en: Option<String>,
    pub teaser_nl: Option<String>,
    pub teaser_en: Option<String>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub description_extra_nl: Option<String>,
    pub description_extra_en: Option<String>,
    pub description_2_nl: Option<String>,
    pub description_2_en: Option<String>,
    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub quote_nl: Option<String>,
    pub quote_en: Option<String>,
    pub quote_source_nl: Option<String>,
    pub quote_source_en: Option<String>,
    pub programme_nl: Option<String>,
    pub programme_en: Option<String>,
    pub info_nl: Option<String>,
    pub info_en: Option<String>,
    pub description_short_nl: Option<String>,
    pub description_short_en: Option<String>,
    pub eticket_info: Option<String>,

    // pub genres: Option<String>,
    // pub uitdatabank_keywords: Option<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,

    /// Derived: "complete" if all key content fields are present, otherwise "partial".
    /// Read-only — ignored when deserializing (never persisted).
    #[serde(skip_deserializing, default)]
    pub metadata_status: String,
}

impl From<ProductionPayload> for Production {
    fn from(o: ProductionPayload) -> Self {
        Self {
            id: o.id,
            source_id: o.source_id,
            slug: o.slug,
            supertitle_nl: o.supertitle_nl,
            supertitle_en: o.supertitle_en,
            title_nl: o.title_nl,
            title_en: o.title_en,
            artist_nl: o.artist_nl,
            artist_en: o.artist_en,
            meta_title_nl: o.meta_title_nl,
            meta_title_en: o.meta_title_en,
            meta_description_nl: o.meta_description_nl,
            meta_description_en: o.meta_description_en,
            tagline_nl: o.tagline_nl,
            tagline_en: o.tagline_en,
            teaser_nl: o.teaser_nl,
            teaser_en: o.teaser_en,
            description_nl: o.description_nl,
            description_en: o.description_en,
            description_extra_nl: o.description_extra_nl,
            description_extra_en: o.description_extra_en,
            description_2_nl: o.description_2_nl,
            description_2_en: o.description_2_en,
            video_1: o.video_1,
            video_2: o.video_2,
            quote_nl: o.quote_nl,
            quote_en: o.quote_en,
            quote_source_nl: o.quote_source_nl,
            quote_source_en: o.quote_source_en,
            programme_nl: o.programme_nl,
            programme_en: o.programme_en,
            info_nl: o.info_nl,
            info_en: o.info_en,
            description_short_nl: o.description_short_nl,
            description_short_en: o.description_short_en,
            eticket_info: o.eticket_info,
            uitdatabank_theme: o.uitdatabank_theme,
            uitdatabank_type: o.uitdatabank_type,
        }
    }
}

impl From<Production> for ProductionPayload {
    fn from(o: Production) -> Self {
        let metadata_status = compute_metadata_status(&o);
        Self {
            id: o.id,
            source_id: o.source_id,
            slug: o.slug,
            supertitle_nl: o.supertitle_nl,
            supertitle_en: o.supertitle_en,
            title_nl: o.title_nl,
            title_en: o.title_en,
            artist_nl: o.artist_nl,
            artist_en: o.artist_en,
            meta_title_nl: o.meta_title_nl,
            meta_title_en: o.meta_title_en,
            meta_description_nl: o.meta_description_nl,
            meta_description_en: o.meta_description_en,
            tagline_nl: o.tagline_nl,
            tagline_en: o.tagline_en,
            teaser_nl: o.teaser_nl,
            teaser_en: o.teaser_en,
            description_nl: o.description_nl,
            description_en: o.description_en,
            description_extra_nl: o.description_extra_nl,
            description_extra_en: o.description_extra_en,
            description_2_nl: o.description_2_nl,
            description_2_en: o.description_2_en,
            video_1: o.video_1,
            video_2: o.video_2,
            quote_nl: o.quote_nl,
            quote_en: o.quote_en,
            quote_source_nl: o.quote_source_nl,
            quote_source_en: o.quote_source_en,
            programme_nl: o.programme_nl,
            programme_en: o.programme_en,
            info_nl: o.info_nl,
            info_en: o.info_en,
            description_short_nl: o.description_short_nl,
            description_short_en: o.description_short_en,
            eticket_info: o.eticket_info,
            uitdatabank_theme: o.uitdatabank_theme,
            uitdatabank_type: o.uitdatabank_type,
            metadata_status,
        }
    }
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[owned_into(ProductionCreate)]
pub struct ProductionPostPayload {
    pub source_id: Option<i32>,
    pub slug: String,

    pub supertitle_nl: Option<String>,
    pub supertitle_en: Option<String>,
    pub title_nl: Option<String>,
    pub title_en: Option<String>,
    pub artist_nl: Option<String>,
    pub artist_en: Option<String>,
    pub meta_title_nl: Option<String>,
    pub meta_title_en: Option<String>,
    pub meta_description_nl: Option<String>,
    pub meta_description_en: Option<String>,
    pub tagline_nl: Option<String>,
    pub tagline_en: Option<String>,
    pub teaser_nl: Option<String>,
    pub teaser_en: Option<String>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub description_extra_nl: Option<String>,
    pub description_extra_en: Option<String>,
    pub description_2_nl: Option<String>,
    pub description_2_en: Option<String>,
    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub quote_nl: Option<String>,
    pub quote_en: Option<String>,
    pub quote_source_nl: Option<String>,
    pub quote_source_en: Option<String>,
    pub programme_nl: Option<String>,
    pub programme_en: Option<String>,
    pub info_nl: Option<String>,
    pub info_en: Option<String>,
    pub description_short_nl: Option<String>,
    pub description_short_en: Option<String>,
    pub eticket_info: Option<String>,

    // pub genres: Option<String>,
    // pub uitdatabank_keywords: Option<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}
