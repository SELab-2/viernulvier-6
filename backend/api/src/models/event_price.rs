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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_event_price(id: &str) -> ApiEventPrice {
        let now = Utc::now();
        ApiEventPrice {
            id: id.into(),
            jsonld_type: "EventPrice".into(),
            created_at: now,
            updated_at: now,
            available: 12,
            amount: "42.50".into(),
            box_office_id: Some("box-office".into()),
            contingent_id: Some(7),
            expires_at: Some(now),
            event: "/api/v1/events/1".into(),
            price: "/api/v1/prices/2".into(),
            rank: "/api/v1/prices/ranks/3".into(),
        }
    }

    #[test]
    fn to_create_maps_api_event_price_fields() {
        let event_id = Uuid::now_v7();
        let price_id = Uuid::now_v7();
        let rank_id = Uuid::now_v7();

        let create = make_event_price("/api/v1/events/prices/88")
            .to_create(event_id, price_id, rank_id, 4250);

        assert_eq!(create.source_id, Some(88));
        assert_eq!(create.event_id, event_id);
        assert_eq!(create.price_id, price_id);
        assert_eq!(create.rank_id, rank_id);
        assert_eq!(create.available, 12);
        assert_eq!(create.amount_cents, 4250);
        assert_eq!(create.box_office_id.as_deref(), Some("box-office"));
        assert_eq!(create.contingent_id, Some(7));
        assert!(create.expires_at.is_some());
    }

    #[test]
    fn to_model_preserves_existing_id_and_create_fields() {
        let id = Uuid::now_v7();
        let event_id = Uuid::now_v7();
        let price_id = Uuid::now_v7();
        let rank_id = Uuid::now_v7();

        let model = make_event_price("/api/v1/events/prices/not-an-id")
            .to_model(id, event_id, price_id, rank_id, 4250);

        assert_eq!(model.id, id);
        assert_eq!(model.source_id, None);
        assert_eq!(model.event_id, event_id);
        assert_eq!(model.price_id, price_id);
        assert_eq!(model.rank_id, rank_id);
        assert_eq!(model.amount_cents, 4250);
    }
}
