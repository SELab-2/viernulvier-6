use chrono::{DateTime, Utc};
use database::{
    Database,
    models::event::{Event, EventCreate},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use base64::{Engine, prelude::BASE64_URL_SAFE};

use crate::{
    dto::{event_price::EventPricePayload, paginated::PaginatedResponse},
    error::AppError,
};

impl EventPayload {
    pub async fn all(
        db: &Database,
        id_cursor: Option<String>,
        limit: u32,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let id_cursor: Option<Uuid> = id_cursor.and_then(|b64| {
            let bytes: [u8; 16] = BASE64_URL_SAFE.decode(b64).ok()?.try_into().ok()?;
            Some(Uuid::from_bytes(bytes))
        });

        let limit = limit as usize;
        let events = db.events().all(limit + 1, id_cursor).await?;
        let mut data = Vec::with_capacity(events.len());
        for event in events {
            data.push(Self::from_model(db, event).await?);
        }

        // only return a cursor if there are more items
        let next_cursor = if data.len() == limit + 1 {
            data.pop();
            data.last().map(|e| BASE64_URL_SAFE.encode(e.id))
        } else {
            None
        };

        Ok(PaginatedResponse { data, next_cursor })
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        let event = db.events().by_id(id).await?;
        Self::from_model(db, event).await
    }

    pub async fn by_production(db: &Database, id: Uuid) -> Result<Vec<Self>, AppError> {
        let events = db.events().by_production(id).await?;
        let mut payloads = Vec::with_capacity(events.len());
        for event in events {
            payloads.push(Self::from_model(db, event).await?);
        }
        Ok(payloads)
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        let (event, prices) = self.into_parts();
        let updated = db.events().update(event).await?;
        EventPricePayload::sync_for_event(db, updated.id, prices).await?;
        Self::from_model(db, updated).await
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.events().delete(id).await?)
    }

    async fn from_model(db: &Database, value: Event) -> Result<Self, AppError> {
        Ok(Self {
            id: value.id,
            source_id: value.source_id,
            created_at: value.created_at,
            updated_at: value.updated_at,
            starts_at: value.starts_at,
            ends_at: value.ends_at,
            intermission_at: value.intermission_at,
            doors_at: value.doors_at,
            vendor_id: value.vendor_id,
            box_office_id: value.box_office_id,
            uitdatabank_id: value.uitdatabank_id,
            max_tickets_per_order: value.max_tickets_per_order,
            production_id: value.production_id,
            status: value.status,
            hall_id: value.hall_id,
            prices: EventPricePayload::by_event(db, value.id).await?,
        })
    }
}

impl EventPostPayload {
    pub async fn create(self, db: &Database) -> Result<EventPayload, AppError> {
        let (event, prices) = self.into_parts();
        let event = db.events().insert(event).await?;
        EventPricePayload::sync_for_event(db, event.id, prices).await?;
        EventPayload::from_model(db, event).await
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct EventPayload {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,
    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub uitdatabank_id: Option<String>,
    pub max_tickets_per_order: Option<i32>,
    pub production_id: Uuid,
    pub status: String,
    pub hall_id: Option<Uuid>,
    #[serde(default)]
    pub prices: Vec<EventPricePayload>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct EventPostPayload {
    pub source_id: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,
    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub uitdatabank_id: Option<String>,
    pub max_tickets_per_order: Option<i32>,
    pub production_id: Uuid,
    pub status: String,
    pub hall_id: Option<Uuid>,
    #[serde(default)]
    pub prices: Vec<EventPricePayload>,
}

impl From<EventPayload> for Event {
    fn from(value: EventPayload) -> Self {
        Self {
            id: value.id,
            source_id: value.source_id,
            created_at: value.created_at,
            updated_at: value.updated_at,
            starts_at: value.starts_at,
            ends_at: value.ends_at,
            intermission_at: value.intermission_at,
            doors_at: value.doors_at,
            vendor_id: value.vendor_id,
            box_office_id: value.box_office_id,
            uitdatabank_id: value.uitdatabank_id,
            max_tickets_per_order: value.max_tickets_per_order,
            production_id: value.production_id,
            status: value.status,
            hall_id: value.hall_id,
        }
    }
}

impl From<EventPostPayload> for EventCreate {
    fn from(value: EventPostPayload) -> Self {
        Self {
            source_id: value.source_id,
            created_at: value.created_at,
            updated_at: value.updated_at,
            starts_at: value.starts_at,
            ends_at: value.ends_at,
            intermission_at: value.intermission_at,
            doors_at: value.doors_at,
            vendor_id: value.vendor_id,
            box_office_id: value.box_office_id,
            uitdatabank_id: value.uitdatabank_id,
            max_tickets_per_order: value.max_tickets_per_order,
            production_id: value.production_id,
            status: value.status,
            hall_id: value.hall_id,
        }
    }
}

impl EventPayload {
    fn into_parts(self) -> (Event, Vec<EventPricePayload>) {
        let Self {
            id,
            source_id,
            created_at,
            updated_at,
            starts_at,
            ends_at,
            intermission_at,
            doors_at,
            vendor_id,
            box_office_id,
            uitdatabank_id,
            max_tickets_per_order,
            production_id,
            status,
            hall_id,
            prices,
        } = self;

        (
            Event {
                id,
                source_id,
                created_at,
                updated_at,
                starts_at,
                ends_at,
                intermission_at,
                doors_at,
                vendor_id,
                box_office_id,
                uitdatabank_id,
                max_tickets_per_order,
                production_id,
                status,
                hall_id,
            },
            prices,
        )
    }
}

impl EventPostPayload {
    fn into_parts(self) -> (EventCreate, Vec<EventPricePayload>) {
        let Self {
            source_id,
            created_at,
            updated_at,
            starts_at,
            ends_at,
            intermission_at,
            doors_at,
            vendor_id,
            box_office_id,
            uitdatabank_id,
            max_tickets_per_order,
            production_id,
            status,
            hall_id,
            prices,
        } = self;

        (
            EventCreate {
                source_id,
                created_at,
                updated_at,
                starts_at,
                ends_at,
                intermission_at,
                doors_at,
                vendor_id,
                box_office_id,
                uitdatabank_id,
                max_tickets_per_order,
                production_id,
                status,
                hall_id,
            },
            prices,
        )
    }
}
