use database::{
    Database,
    models::space::{Space, SpaceCreate},
};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use base64::{Engine, prelude::BASE64_URL_SAFE};

use crate::{dto::paginated::PaginatedResponse, error::AppError};

impl SpacePayload {
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
        let mut data: Vec<_> = db
            .spaces()
            .all(limit + 1, id_cursor)
            .await?
            .into_iter()
            .map(Self::from)
            .collect();

        // only return a cursor if there are more items
        let next_cursor = if data.len() == limit + 1 {
            data.pop();
            data.last().map(|s| BASE64_URL_SAFE.encode(s.id))
        } else {
            None
        };

        Ok(PaginatedResponse { data, next_cursor })
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
