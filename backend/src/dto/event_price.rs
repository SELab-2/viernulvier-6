use std::collections::HashSet;

use chrono::{DateTime, Utc};
use database::{
    Database,
    models::{
        event_price::{EventPrice, EventPriceCreate},
        price::{Price, PriceCreate},
        price_rank::{PriceRank, PriceRankCreate},
    },
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
pub struct EventNestedPricePayload {
    pub id: Option<Uuid>,
    pub source_id: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub r#type: String,
    pub visibility: String,
    pub code: Option<String>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub minimum: i32,
    pub maximum: Option<i32>,
    pub step: i32,
    pub order: i32,
    pub auto_select_combo: bool,
    pub include_in_price_range: bool,
    pub cineville_box: bool,
    pub membership: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
pub struct EventNestedPriceRankPayload {
    pub id: Option<Uuid>,
    pub source_id: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub code: String,
    pub position: i32,
    pub sold_out_buffer: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EventPricePayload {
    pub id: Option<Uuid>,
    pub source_id: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub available: i32,
    pub amount_cents: i32,
    pub box_office_id: Option<String>,
    pub contingent_id: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub price: EventNestedPricePayload,
    pub rank: EventNestedPriceRankPayload,
}

impl EventPricePayload {
    pub async fn by_event(db: &Database, event_id: Uuid) -> Result<Vec<Self>, AppError> {
        let items = db.event_prices().by_event(event_id).await?;
        let mut result = Vec::with_capacity(items.len());
        for item in items {
            result.push(Self::from_model(db, item).await?);
        }
        Ok(result)
    }

    pub async fn sync_for_event(
        db: &Database,
        event_id: Uuid,
        prices: Vec<Self>,
    ) -> Result<(), AppError> {
        let existing = db.event_prices().by_event(event_id).await?;
        let mut keep_ids = HashSet::new();

        for price_payload in prices {
            let Self {
                id,
                source_id,
                created_at,
                updated_at,
                available,
                amount_cents,
                box_office_id,
                contingent_id,
                expires_at,
                price,
                rank,
            } = price_payload;

            let price = price.upsert(db).await?;
            let rank = rank.upsert(db).await?;
            let price_id = price.id;
            let rank_id = rank.id;
            let event_price = Self {
                id,
                source_id,
                created_at,
                updated_at,
                available,
                amount_cents,
                box_office_id,
                contingent_id,
                expires_at,
                price: price.into(),
                rank: rank.into(),
            }
            .upsert(db, event_id, price_id, rank_id)
            .await?;
            keep_ids.insert(event_price.id);
        }

        for event_price in existing {
            if !keep_ids.contains(&event_price.id) {
                db.event_prices().delete(event_price.id).await?;
            }
        }

        Ok(())
    }

    async fn from_model(db: &Database, value: EventPrice) -> Result<Self, AppError> {
        let price = EventNestedPricePayload::from(db.prices().by_id(value.price_id).await?);
        let rank = EventNestedPriceRankPayload::from(db.price_ranks().by_id(value.rank_id).await?);

        Ok(Self {
            id: Some(value.id),
            source_id: value.source_id,
            created_at: Some(value.created_at),
            updated_at: Some(value.updated_at),
            available: value.available,
            amount_cents: value.amount_cents,
            box_office_id: value.box_office_id,
            contingent_id: value.contingent_id,
            expires_at: value.expires_at,
            price,
            rank,
        })
    }

    async fn upsert(
        self,
        db: &Database,
        event_id: Uuid,
        price_id: Uuid,
        rank_id: Uuid,
    ) -> Result<EventPrice, AppError> {
        let now = Utc::now();

        if let Some(id) = self.id {
            let existing = db.event_prices().by_id(id).await?;

            if existing.event_id != event_id {
                return Err(AppError::PayloadError(
                    "event price does not belong to event".into(),
                ));
            }

            return Ok(db
                .event_prices()
                .update(self.into_model(id, event_id, price_id, rank_id, &existing, now))
                .await?);
        }

        Ok(db
            .event_prices()
            .insert(self.into_create(event_id, price_id, rank_id, now))
            .await?)
    }

    fn into_model(
        self,
        id: Uuid,
        event_id: Uuid,
        price_id: Uuid,
        rank_id: Uuid,
        existing: &EventPrice,
        now: DateTime<Utc>,
    ) -> EventPrice {
        EventPrice {
            id,
            source_id: self.source_id.or(existing.source_id),
            event_id,
            price_id,
            rank_id,
            created_at: self.created_at.unwrap_or(existing.created_at),
            updated_at: self.updated_at.unwrap_or(now),
            available: self.available,
            amount_cents: self.amount_cents,
            box_office_id: self.box_office_id,
            contingent_id: self.contingent_id,
            expires_at: self.expires_at,
        }
    }

    fn into_create(
        self,
        event_id: Uuid,
        price_id: Uuid,
        rank_id: Uuid,
        now: DateTime<Utc>,
    ) -> EventPriceCreate {
        EventPriceCreate {
            source_id: self.source_id,
            event_id,
            price_id,
            rank_id,
            created_at: self.created_at.unwrap_or(now),
            updated_at: self.updated_at.unwrap_or(now),
            available: self.available,
            amount_cents: self.amount_cents,
            box_office_id: self.box_office_id,
            contingent_id: self.contingent_id,
            expires_at: self.expires_at,
        }
    }
}

impl EventNestedPricePayload {
    async fn upsert(self, db: &Database) -> Result<Price, AppError> {
        let now = Utc::now();

        if let Some(id) = self.id {
            let existing = db.prices().by_id(id).await?;

            return Ok(db
                .prices()
                .update(self.into_model(id, &existing, now))
                .await?);
        }

        if let Some(source_id) = self.source_id
            && let Some(existing) = db.prices().by_source_id(source_id).await?
        {
            return Ok(db
                .prices()
                .update(self.into_model(existing.id, &existing, now))
                .await?);
        }
        Ok(db.prices().insert(self.into_create(now)).await?)
    }

    fn into_model(self, id: Uuid, existing: &Price, now: DateTime<Utc>) -> Price {
        Price {
            id,
            source_id: self.source_id.or(existing.source_id),
            created_at: self.created_at.unwrap_or(existing.created_at),
            updated_at: self.updated_at.unwrap_or(now),
            price_type: self.r#type,
            visibility: self.visibility,
            code: self.code,
            description_nl: self.description_nl,
            description_en: self.description_en,
            minimum: self.minimum,
            maximum: self.maximum,
            step: self.step,
            display_order: self.order,
            auto_select_combo: self.auto_select_combo,
            include_in_price_range: self.include_in_price_range,
            cineville_box: self.cineville_box,
            membership: self.membership,
        }
    }

    fn into_create(self, now: DateTime<Utc>) -> PriceCreate {
        PriceCreate {
            source_id: self.source_id,
            created_at: self.created_at.unwrap_or(now),
            updated_at: self.updated_at.unwrap_or(now),
            price_type: self.r#type,
            visibility: self.visibility,
            code: self.code,
            description_nl: self.description_nl,
            description_en: self.description_en,
            minimum: self.minimum,
            maximum: self.maximum,
            step: self.step,
            display_order: self.order,
            auto_select_combo: self.auto_select_combo,
            include_in_price_range: self.include_in_price_range,
            cineville_box: self.cineville_box,
            membership: self.membership,
        }
    }
}

impl EventNestedPriceRankPayload {
    async fn upsert(self, db: &Database) -> Result<PriceRank, AppError> {
        let now = Utc::now();

        if let Some(id) = self.id {
            let existing = db.price_ranks().by_id(id).await?;

            return Ok(db
                .price_ranks()
                .update(self.into_model(id, &existing, now))
                .await?);
        }

        if let Some(source_id) = self.source_id
            && let Some(existing) = db.price_ranks().by_source_id(source_id).await?
        {
            return Ok(db
                .price_ranks()
                .update(self.into_model(existing.id, &existing, now))
                .await?);
        }

        Ok(db.price_ranks().insert(self.into_create(now)).await?)
    }

    fn into_model(self, id: Uuid, existing: &PriceRank, now: DateTime<Utc>) -> PriceRank {
        PriceRank {
            id,
            source_id: self.source_id.or(existing.source_id),
            created_at: self.created_at.unwrap_or(existing.created_at),
            updated_at: self.updated_at.unwrap_or(now),
            description_nl: self.description_nl,
            description_en: self.description_en,
            code: self.code,
            position: self.position,
            sold_out_buffer: self.sold_out_buffer,
        }
    }

    fn into_create(self, now: DateTime<Utc>) -> PriceRankCreate {
        PriceRankCreate {
            source_id: self.source_id,
            created_at: self.created_at.unwrap_or(now),
            updated_at: self.updated_at.unwrap_or(now),
            description_nl: self.description_nl,
            description_en: self.description_en,
            code: self.code,
            position: self.position,
            sold_out_buffer: self.sold_out_buffer,
        }
    }
}

impl From<Price> for EventNestedPricePayload {
    fn from(value: Price) -> Self {
        Self {
            id: Some(value.id),
            source_id: value.source_id,
            created_at: Some(value.created_at),
            updated_at: Some(value.updated_at),
            r#type: value.price_type,
            visibility: value.visibility,
            code: value.code,
            description_nl: value.description_nl,
            description_en: value.description_en,
            minimum: value.minimum,
            maximum: value.maximum,
            step: value.step,
            order: value.display_order,
            auto_select_combo: value.auto_select_combo,
            include_in_price_range: value.include_in_price_range,
            cineville_box: value.cineville_box,
            membership: value.membership,
        }
    }
}

impl From<PriceRank> for EventNestedPriceRankPayload {
    fn from(value: PriceRank) -> Self {
        Self {
            id: Some(value.id),
            source_id: value.source_id,
            created_at: Some(value.created_at),
            updated_at: Some(value.updated_at),
            description_nl: value.description_nl,
            description_en: value.description_en,
            code: value.code,
            position: value.position,
            sold_out_buffer: value.sold_out_buffer,
        }
    }
}
