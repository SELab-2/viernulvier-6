use base64::{Engine, prelude::BASE64_URL_SAFE};
use database::{Database, models::location::Location};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use database::models::location::LocationCreate;

use crate::{dto::paginated::PaginatedResponse, error::AppError};

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
    pub slug: Option<String>,
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
    pub slug: Option<String>,
}

impl LocationPayload {
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
            .locations()
            .all(limit + 1, id_cursor)
            .await?
            .into_iter()
            .map(Self::from)
            .collect();

        // only return a cursor if there are more items
        let next_cursor = if data.len() == limit + 1 {
            data.pop();
            data.last().map(|l| BASE64_URL_SAFE.encode(l.id))
        } else {
            None
        };

        Ok(PaginatedResponse { data, next_cursor })
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(Self::from(db.locations().by_id(id).await?))
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
