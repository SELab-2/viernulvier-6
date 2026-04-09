use database::{Database, models::artist::Artist};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{dto::production::ProductionPayload, error::AppError};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArtistPayload {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
}

impl From<Artist> for ArtistPayload {
    fn from(a: Artist) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            name: a.name,
        }
    }
}

impl ArtistPayload {
    pub async fn all(db: &Database) -> Result<Vec<Self>, AppError> {
        Ok(db
            .artists()
            .all()
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.artists().by_id(id).await?.into())
    }

    pub async fn productions(db: &Database, id: Uuid) -> Result<Vec<ProductionPayload>, AppError> {
        let production_ids = db.artists().production_ids_for(id).await?;

        Ok(db
            .productions()
            .by_ids(&production_ids)
            .await?
            .into_iter()
            .map(ProductionPayload::from)
            .collect())
    }
}
