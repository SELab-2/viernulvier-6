use chrono::{DateTime, Utc};
use database::models::event_price::{EventPrice, EventPriceCreate};
use serde::Deserialize;
use uuid::Uuid;

use crate::helper::extract_source_id;

#[derive(Debug, Deserialize)]
pub struct ApiEventPrice {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub available: i32,
    pub amount: String,
    pub box_office_id: Option<String>,
    pub contingent_id: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub event: String,
    pub price: String,
    pub rank: String,
}

impl ApiEventPrice {
    pub fn to_create(
        self,
        event_id: Uuid,
        price_id: Uuid,
        rank_id: Uuid,
        amount_cents: i32,
    ) -> EventPriceCreate {
        EventPriceCreate {
            source_id: extract_source_id(&self.id),
            event_id,
            price_id,
            rank_id,
            created_at: self.created_at,
            updated_at: self.updated_at,
            available: self.available,
            amount_cents,
            box_office_id: self.box_office_id,
            contingent_id: self.contingent_id,
            expires_at: self.expires_at,
        }
    }

    pub fn to_model(
        self,
        id: Uuid,
        event_id: Uuid,
        price_id: Uuid,
        rank_id: Uuid,
        amount_cents: i32,
    ) -> EventPrice {
        let create = self.to_create(event_id, price_id, rank_id, amount_cents);

        EventPrice {
            id,
            source_id: create.source_id,
            event_id: create.event_id,
            price_id: create.price_id,
            rank_id: create.rank_id,
            created_at: create.created_at,
            updated_at: create.updated_at,
            available: create.available,
            amount_cents: create.amount_cents,
            box_office_id: create.box_office_id,
            contingent_id: create.contingent_id,
            expires_at: create.expires_at,
        }
    }
}
