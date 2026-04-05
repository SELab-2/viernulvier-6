use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::DatabaseError, models::artist::Artist};

pub struct ArtistRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ArtistRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn all(&self) -> Result<Vec<Artist>, DatabaseError> {
        Ok(sqlx::query_as!(
            Artist,
            "SELECT id, created_at, updated_at, slug, name FROM artists ORDER BY name ASC"
        )
        .fetch_all(self.db)
        .await?)
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Artist, DatabaseError> {
        sqlx::query_as!(
            Artist,
            "SELECT id, created_at, updated_at, slug, name FROM artists WHERE id = $1",
            id
        )
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }
}
