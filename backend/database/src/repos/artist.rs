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

    pub async fn insert(&self, name: &str, slug: &str) -> Result<Artist, DatabaseError> {
        sqlx::query_as::<_, Artist>(
            "INSERT INTO artists (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING *",
        )
        .bind(name)
        .bind(slug)
        .fetch_optional(self.db)
        .await?
        .ok_or_else(|| DatabaseError::Conflict(format!("artist with slug '{slug}' already exists")))
    }

    pub async fn update(&self, id: Uuid, name: &str, slug: &str) -> Result<Artist, DatabaseError> {
        sqlx::query_as::<_, Artist>(
            "UPDATE artists SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
        )
        .bind(name)
        .bind(slug)
        .bind(id)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let result = sqlx::query("DELETE FROM artists WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;
        if result.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }
        Ok(())
    }
}
