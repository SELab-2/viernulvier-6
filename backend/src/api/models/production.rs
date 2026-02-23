use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::api::models::localized_text::ApiLocalizedText;

#[derive(Deserialize, Debug)]
pub struct ApiProduction {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub vendor_id: String,
    pub box_office_id: Option<u64>,
    pub performer_field: Option<String>,
    pub performer_type: Option<String>,
    pub attendance_mode: String,

    // info
    pub supertitle: Option<ApiLocalizedText>,
    pub title: Option<ApiLocalizedText>,
    pub artist: Option<ApiLocalizedText>,
    pub meta_title: Option<ApiLocalizedText>,
    pub meta_description: Option<ApiLocalizedText>,
    pub tagline: Option<ApiLocalizedText>,
    pub teaser: Option<ApiLocalizedText>,
    pub description: Option<ApiLocalizedText>,
    pub description_extra: Option<ApiLocalizedText>,
    pub description_2: Option<ApiLocalizedText>,
    pub video_1: Option<ApiLocalizedText>,
    pub video_2: Option<ApiLocalizedText>,
    pub quote: Option<ApiLocalizedText>,
    pub quote_source: Option<ApiLocalizedText>,
    pub programme: Option<ApiLocalizedText>,
    pub info: Option<ApiLocalizedText>,
    pub description_short: Option<ApiLocalizedText>,
    pub eticket_info: Option<ApiLocalizedText>,
    // pub custom_data: LocalizedText, // not currently in the api at all

    // links to others
    pub genres: Vec<String>,
    pub events: Vec<String>,
    pub media_gallery: Option<String>,
    pub review_gallery: Option<String>,
    pub poster_gallery: Option<String>,

    pub uitdatabank_keywords: Vec<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}
