use database::{
    Database,
    models::{artist::Artist, entity_type::EntityType},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{dto::production::ProductionPayload, dto::build_cover_url, error::AppError};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArtistPayload {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    /// Cover image URL resolved from the entity_media link (output-only).
    #[serde(default)]
    #[schema(read_only, nullable)]
    pub cover_image_url: Option<String>,
}

impl From<Artist> for ArtistPayload {
    fn from(a: Artist) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            name: a.name,
            cover_image_url: None,
        }
    }
}

impl ArtistPayload {
    pub async fn all(db: &Database, public_url: Option<&str>) -> Result<Vec<Self>, AppError> {
        let mut result: Vec<Self> = db
            .artists()
            .all()
            .await?
            .into_iter()
            .map(Self::from)
            .collect();

        if let Some(base) = public_url {
            let ids: Vec<Uuid> = result.iter().map(|a| a.id).collect();
            let cover_keys = db
                .media()
                .cover_s3_keys_for_entities(EntityType::Artist, &ids)
                .await?;
            for a in &mut result {
                if let Some(key) = cover_keys.get(&a.id) {
                    a.cover_image_url = Some(build_cover_url(base, key));
                }
            }
        }

        Ok(result)
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.artists().by_id(id).await?.into())
    }

    pub async fn productions(db: &Database, id: Uuid) -> Result<Vec<ProductionPayload>, AppError> {
        Ok(db
            .productions()
            .by_artist_id(id)
            .await?
            .into_iter()
            .map(ProductionPayload::from)
            .collect())
    }
}
