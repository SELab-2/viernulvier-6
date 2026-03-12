use chrono::{DateTime, Utc};
use database::{Database, models::event::{Event, EventCreate}};
use o2o::o2o;
use serde::{Serialize, Deserialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;


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

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.events().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.events().delete(id).await?)
    }
}

impl EventPostPayload {
    pub async fn create(self, db: &Database) -> Result<EventPayload, AppError> {
        Ok(db.events().insert(self.into()).await?.into())
    }
}


#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[map_owned(Event)]
pub struct EventPayload {
    pub id: Uuid,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub vendor_id: String,
    pub box_office_id: String,
    pub uitdatabank_id: Option<String>,
    pub max_tickets_per_order: Option<i32>,

    pub production_id: Uuid,
    pub status: String,
    pub hall_id: Option<Uuid>,
}



#[derive(o2o, Deserialize, ToSchema)]
#[owned_into(EventCreate)]
pub struct EventPostPayload {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub vendor_id: String,
    pub box_office_id: String,
    pub uitdatabank_id: Option<String>,
    pub max_tickets_per_order: Option<i32>,

    pub production_id: Uuid,
    pub status: String,
    pub hall_id: Option<Uuid>,
}