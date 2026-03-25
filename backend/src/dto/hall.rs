use database::{
    Database,
    models::hall::{Hall, HallCreate},
};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

impl HallPayload {
    pub async fn all(db: &Database, limit: u32) -> Result<Vec<Self>, AppError> {
        Ok(db
            .halls()
            .all(limit as usize)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.halls().by_id(id).await?.into())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.halls().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.halls().delete(id).await?)
    }
}

impl HallPostPayload {
    pub async fn create(self, db: &Database) -> Result<HallPayload, AppError> {
        Ok(db.halls().insert(self.into()).await?.into())
    }
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[map_owned(Hall)]
pub struct HallPayload {
    pub id: Uuid,

    pub source_id: Option<i32>,

    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub seat_selection: Option<bool>,
    pub open_seating: Option<bool>,
    pub name: String,
    pub remark: Option<String>,
    pub slug: String,

    pub space_id: Option<Uuid>,
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[owned_into(HallCreate)]
pub struct HallPostPayload {
    pub source_id: Option<i32>,
    pub slug: String,

    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub seat_selection: Option<bool>,
    pub open_seating: Option<bool>,
    pub name: String,
    pub remark: Option<String>,

    // reference to space
    pub space_id: Option<Uuid>,
}
