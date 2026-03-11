use chrono::{DateTime, Utc};
use database::models::event::EventCreate;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct ApiEventProduction {
    #[serde(rename = "@id")]
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEventStatus {
    #[serde(rename = "@id")]
    pub id: String,
    pub short_name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEventHall {
    #[serde(rename = "@id")]
    pub id: String,
}

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

    pub production: ApiEventProduction,
    pub status: ApiEventStatus,
    pub hall: ApiEventHall,

    pub info: ApiLocalizedText,
    pub eticket_info: ApiLocalizedText,
    pub external_order_url: ApiLocalizedText,
}

impl From<ApiEvent> for EventCreate {
    fn from(api: ApiEvent) -> Self {
        let production_id = api
            .production
            .id
            .split('/')
            .next_back()
            .and_then(|s| Uuid::parse_str(s).ok())
            .expect("invalid production id in event");

        let hall_id = api
            .hall
            .id
            .split('/')
            .next_back()
            .and_then(|s| Uuid::parse_str(s).ok())
            .expect("invalid hall id in event");

        Self {
            created_at: api.created_at,
            updated_at: api.updated_at,
            starts_at: api.starts_at,
            ends_at: api.ends_at,
            intermission_at: api.intermission_at,
            doors_at: api.doors_at,
            vendor_id: api.vendor_id,
            box_office_id: api.box_office_id,
            uitdatabank_id: api.uitdatabank_id,
            max_tickets_per_order: i32::try_from(api.max_tickets_per_order)
                .expect("max_tickets_per_order out of range for i32"),
            production_id,
            status: api.status.short_name,
            hall_id,
        }
    }
}