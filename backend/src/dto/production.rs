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
            supertitle_nl: value.supertitle_nl,
            supertitle_en: value.supertitle_en,
            title_nl: value.title_nl,
            title_en: value.title_en,
            artist_nl: value.artist_nl,
            artist_en: value.artist_en,
            meta_title_nl: value.meta_title_nl,
            meta_title_en: value.meta_title_en,
            meta_description_nl: value.meta_description_nl,
            meta_description_en: value.meta_description_en,
            tagline_nl: value.tagline_nl,
            tagline_en: value.tagline_en,
            teaser_nl: value.teaser_nl,
            teaser_en: value.teaser_en,
            description_nl: value.description_nl,
            description_en: value.description_en,
            description_extra_nl: value.description_extra_nl,
            description_extra_en: value.description_extra_en,
            description_2_nl: value.description_2_nl,
            description_2_en: value.description_2_en,
            video_1: value.video_1,
            video_2: value.video_2,
            quote_nl: value.quote_nl,
            quote_en: value.quote_en,
            quote_source_nl: value.quote_source_nl,
            quote_source_en: value.quote_source_en,
            programme_nl: value.programme_nl,
            programme_en: value.programme_en,
            info_nl: value.info_nl,
            info_en: value.info_en,
            description_short_nl: value.description_short_nl,
            description_short_en: value.description_short_en,
            eticket_info: value.eticket_info,
            uitdatabank_theme: value.uitdatabank_theme,
            uitdatabank_type: value.uitdatabank_type,
        }
    }
}
