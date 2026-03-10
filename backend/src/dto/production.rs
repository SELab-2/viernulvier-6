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

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[map_owned(Production)]
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
}

#[derive(o2o, Deserialize, ToSchema)]
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
