use database::{
    Database,
    models::space::{Space, SpaceCreate},
};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

impl SpacePayload {
    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Self>, AppError> {
        Ok(db
            .spaces()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.spaces().by_id(id).await?.into())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.spaces().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.spaces().delete(id).await?)
    }
}

impl SpacePostPayload {
    pub async fn create(self, db: &Database) -> Result<SpacePayload, AppError> {
        Ok(db.spaces().insert(self.into()).await?.into())
    }
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[map_owned(Space)]
pub struct SpacePayload {
    pub id: Uuid,

    pub source_id: Option<i32>,
    pub name_nl: String,
    pub location_id: Uuid,
}

#[derive(o2o, Serialize, Deserialize, ToSchema)]
#[owned_into(SpaceCreate)]
pub struct SpacePostPayload {
    pub source_id: Option<i32>,
    pub name_nl: String,
    pub location_id: Uuid,
}

