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

    pub async fn search(&self, q: Option<&str>) -> Result<Vec<Artist>, DatabaseError> {
        match q {
            None => self.all().await,
            Some(term) => {
                let pattern = format!("%{term}%");
                Ok(
                    sqlx::query_as::<_, Artist>(
                        "SELECT * FROM artists \
                         WHERE name ILIKE $1 OR slug ILIKE $1 \
                         ORDER BY name ASC",
                    )
                    .bind(&pattern)
                    .fetch_all(self.db)
                    .await?,
                )
            }
        }
    }

    pub async fn paginated(
        &self,
        limit: u32,
        cursor: Option<(String, Uuid)>,
        q: Option<&str>,
    ) -> Result<(Vec<Artist>, Option<(String, Uuid)>), DatabaseError> {
        let fetch_limit: i64 = i64::from(limit) + 1;
        let mut builder = sqlx::QueryBuilder::new("SELECT * FROM artists WHERE true");

        if let Some(term) = q {
            let pattern = format!("%{term}%");
            builder
                .push(" AND (name ILIKE ")
                .push_bind(pattern.clone())
                .push(" OR slug ILIKE ")
                .push_bind(pattern)
                .push(")");
        }

        if let Some((last_name, last_id)) = &cursor {
            builder
                .push(" AND (name > ")
                .push_bind(last_name.clone())
                .push(" OR (name = ")
                .push_bind(last_name.clone())
                .push(" AND id > ")
                .push_bind(*last_id)
                .push("))");
        }

        builder
            .push(" ORDER BY name ASC, id ASC LIMIT ")
            .push_bind(fetch_limit);

        let mut artists: Vec<Artist> = builder.build_query_as().fetch_all(self.db).await?;

        let next = if artists.len() == fetch_limit as usize {
            artists.pop();
            artists.last().map(|a| (a.name.clone(), a.id))
        } else {
            None
        };

        Ok((artists, next))
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

    pub async fn by_production_id(&self, production_id: Uuid) -> Result<Vec<Artist>, DatabaseError> {
        Ok(
            sqlx::query_as::<_, Artist>(
                "SELECT a.* FROM artists a \
                 INNER JOIN production_artists pa ON pa.artist_id = a.id \
                 WHERE pa.production_id = $1 \
                 ORDER BY a.id ASC",
            )
            .bind(production_id)
            .fetch_all(self.db)
            .await?,
        )
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
