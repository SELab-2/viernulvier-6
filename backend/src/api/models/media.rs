use crate::api::models::localized_text::LocalizedText;
use chrono::{DateTime, Utc};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ApiMediaGallery {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub name: String,
    pub items: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApiMediaItem {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    #[serde(rename = "type")]
    pub r#type: String,
    pub original_filename: String,
    pub position: u32,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub gallery: String,

    pub title: LocalizedText,
    pub description: LocalizedText,
    pub credits: LocalizedText,
    pub link: LocalizedText,
}
