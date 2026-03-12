use chrono::{DateTime, Utc};
use database::{Database, models::event::Event};
use o2o::o2o;
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(o2o, Serialize, ToSchema)]
#[from_owned(Event)]
pub struct EventPayload {
    pub id: Uuid,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub vendor_id: String,
    pub box_office_id: String,
    pub uitdatabank_id: String,
    pub max_tickets_per_order: i32,

    pub production_id: Uuid,
    pub status: String,
    pub hall_id: Uuid,
}

impl EventPayload {
    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Self>, AppError> {
        Ok(db
            .events()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.events().by_id(id).await?.into())
    }

    pub async fn by_production(db: &Database, id: Uuid) -> Result<Vec<Self>, AppError> {
        Ok(db.events().by_production(id).await?.into_iter().map(Self::from).collect())
    }
}