use sqlx::PgPool;

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

        pub async fn count(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM artists")
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }
}