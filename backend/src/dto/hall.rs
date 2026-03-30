use database::{
    Database,
    models::hall::{Hall, HallCreate},
};
use o2o::o2o;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use base64::{Engine, prelude::BASE64_URL_SAFE};

use crate::{dto::paginated::PaginatedResponse, error::AppError};

impl HallPayload {
    pub async fn all(
        db: &Database,
        id_cursor: Option<String>,
        limit: usize,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let id_cursor: Option<Uuid> = id_cursor.and_then(|b64| {
            let bytes: [u8; 16] = BASE64_URL_SAFE.decode(b64).ok()?.try_into().ok()?;
            Some(Uuid::from_bytes(bytes))
        });

        let mut data: Vec<_> = db
            .halls()
            .all(limit + 1, id_cursor)
            .await?
            .into_iter()
            .map(Self::from)
            .collect();

        // only return a cursor if there are more items
        let next_cursor = if data.len() == limit + 1 {
            data.pop();
            data.last().map(|h| BASE64_URL_SAFE.encode(h.id))
        } else {
            None
        };

        Ok(PaginatedResponse { data, next_cursor })
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
