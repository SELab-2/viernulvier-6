use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Production {
    pub id: Uuid,

    pub supertitle: Option<LocalizedText>,
    pub title_nl: Option<LocalizedText>,
    pub title_en: Option<LocalizedText>,
    pub artist: Option<LocalizedText>,
    pub meta_title: Option<LocalizedText>,
    pub meta_description: Option<LocalizedText>,
    pub tagline: Option<LocalizedText>,
    pub teaser: Option<LocalizedText>,
    pub description: Option<LocalizedText>,
    pub description_extra: Option<LocalizedText>,
    pub description_2: Option<LocalizedText>,
    pub video_1: Option<LocalizedText>,
    pub video_2: Option<LocalizedText>,
    pub quote: Option<LocalizedText>,
    pub quote_source: Option<LocalizedText>,
    pub programme: Option<LocalizedText>,
    pub info: Option<LocalizedText>,
    pub description_short: Option<LocalizedText>,
    pub eticket_info: Option<LocalizedText>,

    pub genres: Vec<String>,
    pub events: Vec<String>,
    pub media_gallery: Option<String>,
    pub review_gallery: Option<String>,
    pub poster_gallery: Option<String>,
    pub uitdatabank_keywords: Vec<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}
