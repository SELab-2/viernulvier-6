use crate::models::localized_text::ApiLocalizedText;
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

    pub title: ApiLocalizedText,
    pub description: ApiLocalizedText,
    pub credits: ApiLocalizedText,
    pub link: ApiLocalizedText,
    #[serde(default)]
    pub crops: Vec<ApiMediaItemCrop>,
}

#[derive(Debug, Deserialize)]
pub struct ApiMediaItemCrop {
    pub name: String,
    pub url: String,
}
