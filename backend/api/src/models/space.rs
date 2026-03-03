use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct Space {
    #[serde(rename = "@id")]
    pub id: String,

    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub name: ApiLocalizedText,

    /// link to location where the space is located
    /// "/api/v1/locations/{id}"
    pub location: String,

    /// list of linked halls
    /// \[
    ///   "/api/v1/halls/{id}",
    ///   "/api/v1/halls/{id}"
    /// \]
    pub halls: Vec<String>,
}
