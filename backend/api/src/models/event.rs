use chrono::{DateTime, Utc};
use database::models::event::EventCreate;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::localized_text::ApiLocalizedText;
use crate::helper::extract_source_id;

#[derive(Debug, Deserialize)]
pub struct ApiEventProduction {
    #[serde(rename = "@id")]
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEvent {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub box_office_id: Option<String>,
    pub vendor_id: Option<String>,
    pub max_tickets_per_order: Option<u32>,
    pub uitdatabank_id: Option<String>,
    pub secure: bool,
    pub sms_verification: bool,

    pub production: ApiEventProduction,
    pub status: String,
    pub hall: String,

    pub info: Option<ApiLocalizedText>,
    pub eticket_info: Option<ApiLocalizedText>,
    pub external_order_url: Option<ApiLocalizedText>,
}

impl ApiEvent {
    pub fn production_source_id(&self) -> Option<i32> {
        extract_source_id(&self.production.id)
    }

    pub fn hall_source_id(&self) -> Option<i32> {
        extract_source_id(&self.hall)
    }

    pub fn to_create(self, production_id: Uuid, hall_id: Option<Uuid>) -> EventCreate {
        EventCreate {
            source_id: extract_source_id(&self.id),
            created_at: self.created_at,
            updated_at: self.updated_at,
            started_at: self.starts_at,
            ended_at: self.ends_at,
            intermission_at: self.intermission_at,
            doors_at: self.doors_at,    
            vendor_id: self.vendor_id,
            box_office_id: self.box_office_id,
            uitdatabank_id: self.uitdatabank_id,
            max_tickets_per_order: self.max_tickets_per_order
                .map(|v| i32::try_from(v).expect("max_tickets_per_order out of range")),
            production_id,
            status: self.status,
            hall_id,
        }
    }
}