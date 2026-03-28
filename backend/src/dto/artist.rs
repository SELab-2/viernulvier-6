use database::{Database, models::artist::Artist};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArtistPayload {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
}

impl From<Artist> for ArtistPayload {
    fn from(a: Artist) -> Self {
        Self { id: a.id, slug: a.slug, name: a.name }
    }
}

impl ArtistPayload {
    pub async fn all(db: &Database) -> Result<Vec<Self>, AppError> {
        Ok(db.artists().all().await?.into_iter().map(Self::from).collect())
    }
}
