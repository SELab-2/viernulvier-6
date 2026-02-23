use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::api::models::localized_text::LocalizedText;

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
    pub supertitle: Option<LocalizedText>,
    pub title: Option<LocalizedText>,
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
