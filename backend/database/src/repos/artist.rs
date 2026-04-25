use uuid::Uuid;

use sqlx::PgPool;

use crate::{error::DatabaseError, models::artist::Artist};

pub struct ArtistRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ArtistRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Artist, DatabaseError> {
        sqlx::query_as::<_, Artist>("SELECT * FROM artists WHERE id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self) -> Result<Vec<Artist>, DatabaseError> {
        Ok(
            sqlx::query_as::<_, Artist>("SELECT * FROM artists ORDER BY name ASC")
                .fetch_all(self.db)
                .await?,
        )
    }

    pub async fn count(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM artists")
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }
}
