use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct Hall {
    #[serde(rename = "@context")]
    pub context: String,

    #[serde(rename = "@id")]
    pub id: String,

    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub vendor_id: String,
    pub box_office_id: String,

    pub seat_selection: String,
    pub open_seating: String,

    pub name: ApiLocalizedText,
    pub remark: ApiLocalizedText,

    /// link to location where the space is located
    /// "/api/v1/space/{id}"
    pub space: String,
}
