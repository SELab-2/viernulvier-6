use database::{Database, models::production::Production};
use serde::Serialize;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Serialize)]
pub struct ProductionPayload {
    pub id: Uuid,

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

impl ProductionPayload {
    pub async fn all(db: &Database, limit: i64) -> Result<Vec<Self>, AppError> {
        Ok(db
            .productions()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }
}

impl From<Production> for ProductionPayload {
    fn from(value: Production) -> Self {
        Self {
            id: value.id,
            supertitle_nl: value.base.supertitle_nl,
            supertitle_en: value.base.supertitle_en,
            title_nl: value.base.title_nl,
            title_en: value.base.title_en,
            artist_nl: value.base.artist_nl,
            artist_en: value.base.artist_en,
            meta_title_nl: value.base.meta_title_nl,
            meta_title_en: value.base.meta_title_en,
            meta_description_nl: value.base.meta_description_nl,
            meta_description_en: value.base.meta_description_en,
            tagline_nl: value.base.tagline_nl,
            tagline_en: value.base.tagline_en,
            teaser_nl: value.base.teaser_nl,
            teaser_en: value.base.teaser_en,
            description_nl: value.base.description_nl,
            description_en: value.base.description_en,
            description_extra_nl: value.base.description_extra_nl,
            description_extra_en: value.base.description_extra_en,
            description_2_nl: value.base.description_2_nl,
            description_2_en: value.base.description_2_en,
            video_1: value.base.video_1,
            video_2: value.base.video_2,
            quote_nl: value.base.quote_nl,
            quote_en: value.base.quote_en,
            quote_source_nl: value.base.quote_source_nl,
            quote_source_en: value.base.quote_source_en,
            programme_nl: value.base.programme_nl,
            programme_en: value.base.programme_en,
            info_nl: value.base.info_nl,
            info_en: value.base.info_en,
            description_short_nl: value.base.description_short_nl,
            description_short_en: value.base.description_short_en,
            eticket_info: value.base.eticket_info,
            uitdatabank_theme: value.base.uitdatabank_theme,
            uitdatabank_type: value.base.uitdatabank_type,
        }
    }
}
