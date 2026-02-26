use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct ApiEvent {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub box_office_id: String,
    pub vendor_id: String,
    pub max_tickets_per_order: u32,
    pub uitdatabank_id: String,
    pub secure: bool,
    pub sms_verification: bool,

    pub production: String,
    pub status: String,
    pub hall: String,
    pub prices: Vec<String>,

    pub info: ApiLocalizedText,
    pub eticket_info: ApiLocalizedText,
    pub external_order_url: ApiLocalizedText,
}
