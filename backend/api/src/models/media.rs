use crate::models::localized_text::ApiLocalizedText;
use chrono::{DateTime, Utc};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ApiMediaGallery {
    #[serde(rename = "@context")]
    pub context: Option<String>,
    #[serde(rename = "@id")]
    pub id: Option<String>,
    #[serde(rename = "@type")]
    pub r#type: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub name: Option<String>,
    #[serde(default)]
    pub items: Vec<ApiMediaItem>,
}

#[derive(Debug, Deserialize)]
pub struct ApiMediaItem {
    #[serde(rename = "@context")]
    pub context: Option<String>,
    #[serde(rename = "@id")]
    pub id: Option<String>,
    #[serde(rename = "@type")]
    pub jsonld_type: Option<String>,

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    #[serde(rename = "type")]
    pub r#type: Option<String>,
    pub original_filename: Option<String>,
    pub position: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format: Option<String>,
    pub gallery: Option<String>,

    #[serde(default)]
    pub title: ApiLocalizedText,
    #[serde(default)]
    pub description: ApiLocalizedText,
    #[serde(default)]
    pub credits: ApiLocalizedText,
    #[serde(default)]
    pub link: ApiLocalizedText,
    #[serde(default)]
    pub crops: Vec<ApiMediaItemCrop>,
}

#[derive(Debug, Deserialize)]
pub struct ApiMediaItemCrop {
    pub name: Option<String>,
    pub url: Option<String>,
}
