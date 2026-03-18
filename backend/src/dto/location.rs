use database::{Database, models::location::Location};
use o2o::o2o;
use serde::{Serialize, Deserialize};
use utoipa::ToSchema;
use uuid::Uuid;

use database::models::location::LocationCreate;

use crate::error::AppError;

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[map_owned(Location)]
pub struct LocationPayload {
    pub id: Uuid,

    pub source_id: Option<i32>,

    pub name: Option<String>,
    pub code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub postal_code: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone_1: Option<String>,
    pub phone_2: Option<String>,
    pub is_owned_by_viernulvier: Option<bool>,
    pub uitdatabank_id: Option<String>,
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[owned_into(LocationCreate)]
pub struct LocationPostPayload {
    pub source_id: Option<i32>,

    pub name: Option<String>,
    pub code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub postal_code: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone_1: Option<String>,
    pub phone_2: Option<String>,
    pub is_owned_by_viernulvier: Option<bool>,
    pub uitdatabank_id: Option<String>,
}

impl LocationPayload {
    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Self>, AppError> {
        Ok(db
            .locations()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }
    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(Self::from(
            db.locations()
                .by_id(id)
                .await?
        ))
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.locations().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.locations().delete(id).await?)
    }
}

impl LocationPostPayload {
    pub async fn create(self, db: &Database) -> Result<LocationPayload, AppError> {
        Ok(db.locations().insert(self.into()).await?.into())
    }
}
