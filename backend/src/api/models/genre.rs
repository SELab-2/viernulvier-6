use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::api::models::localized_text::LocalizedText;

#[derive(Debug, Deserialize)]
pub struct ApiGenre {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "type")]
    pub r#type: String,
    pub use_as: String,
    pub vendor_id: String,

    pub name: LocalizedText,
    pub slug: LocalizedText,
    pub description: LocalizedText,
}
