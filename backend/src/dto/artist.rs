use base64::{Engine, prelude::BASE64_URL_SAFE};
use database::{
    Database,
    models::{artist::Artist, entity_type::EntityType, filtering::facets::FacetFilters},
};
use serde::{Deserialize, Serialize};
use slug::slugify;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    dto::build_cover_url, dto::paginated::PaginatedResponse, dto::production::ProductionPayload,
    error::AppError,
};

#[derive(Serialize, Deserialize)]
struct ArtistCursor {
    name: String,
    id: Uuid,
}

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
    pub async fn create(
        &self,
        db: &Database,
        public_url: Option<&str>,
    ) -> Result<ArtistPayload, AppError> {
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
    pub async fn update(
        &self,
        db: &Database,
        id: Uuid,
        public_url: Option<&str>,
    ) -> Result<ArtistPayload, AppError> {
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
    pub async fn all(
        db: &Database,
        cursor_str: Option<String>,
        limit: u32,
        public_url: Option<&str>,
        q: Option<&str>,
        facets: &FacetFilters,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let cursor: Option<(String, Uuid)> = cursor_str.and_then(|b64| {
            let bytes = BASE64_URL_SAFE.decode(b64).ok()?;
            let c: ArtistCursor = serde_json::from_slice(&bytes).ok()?;
            Some((c.name, c.id))
        });

        let (artists, next) = db.artists().paginated(limit, cursor, q, facets).await?;
        let mut result: Vec<Self> = artists.into_iter().map(Self::from).collect();

        let next_cursor = next.and_then(|(name, id)| {
            serde_json::to_vec(&ArtistCursor { name, id })
                .ok()
                .map(|v| BASE64_URL_SAFE.encode(v))
        });

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

        Ok(PaginatedResponse {
            data: result,
            next_cursor,
        })
    }

    pub async fn by_id(
        db: &Database,
        id: Uuid,
        public_url: Option<&str>,
    ) -> Result<Self, AppError> {
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

    pub async fn by_production_id(
        db: &Database,
        production_id: Uuid,
        public_url: Option<&str>,
    ) -> Result<Vec<Self>, AppError> {
        let mut result: Vec<Self> = db
            .artists()
            .by_production_id(production_id)
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
