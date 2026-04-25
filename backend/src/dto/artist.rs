use database::{
    Database,
    models::{artist::Artist, entity_type::EntityType},
};
use serde::{Deserialize, Serialize};
use slug::slugify;
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct ArtistPostPayload {
    pub name: String,
}

impl ArtistPostPayload {
    pub async fn create(&self, db: &Database, public_url: Option<&str>) -> Result<ArtistPayload, AppError> {
        let slug = slugify(&self.name);
        let artist = db.artists().insert(&self.name, &slug).await?;
        ArtistPayload::by_id(db, artist.id, public_url).await
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ArtistUpdatePayload {
    pub name: String,
    pub slug: String,
}

impl ArtistUpdatePayload {
    pub async fn update(&self, db: &Database, id: Uuid, public_url: Option<&str>) -> Result<ArtistPayload, AppError> {
        db.artists().update(id, &self.name, &self.slug).await?;
        ArtistPayload::by_id(db, id, public_url).await
    }
}

impl ArtistPayload {
    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        db.artists().delete(id).await?;
        Ok(())
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

    pub async fn by_id(db: &Database, id: Uuid, public_url: Option<&str>) -> Result<Self, AppError> {
        let mut payload: Self = db.artists().by_id(id).await?.into();

        if let Some(base) = public_url {
            let cover_keys = db
                .media()
                .cover_s3_keys_for_entities(EntityType::Artist, &[id])
                .await?;
            if let Some(key) = cover_keys.get(&id) {
                payload.cover_image_url = Some(build_cover_url(base, key));
            }
        }

        Ok(payload)
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
