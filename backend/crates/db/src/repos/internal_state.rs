use sqlx::PgPool;

use crate::{error::DatabaseError, models::internal_state::InternalStateKey};

pub struct InternalStateRepo<'a> {
    db: &'a PgPool,
}

impl<'a> InternalStateRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn get_value(&self, key: InternalStateKey) -> Result<String, DatabaseError> {
        sqlx::query_scalar("SELECT value FROM internal_state WHERE key=$1 LIMIT 1;")
            .bind(key.as_str())
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn set_value(
        &self,
        key: InternalStateKey,
        value: &str,
    ) -> Result<String, DatabaseError> {
        Ok(sqlx::query_scalar(
            "INSERT INTO internal_state (key, value)
                VALUES ($1, $2)
            ON CONFLICT (key)
                DO UPDATE SET value = EXCLUDED.value
            RETURNING value;",
        )
        .bind(key.as_str())
        .bind(value)
        .fetch_one(self.db)
        .await?)
    }
}
