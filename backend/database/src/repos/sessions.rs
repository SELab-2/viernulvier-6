use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::session::{Session, SessionCreate},
};

pub struct SessionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> SessionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_token_hash(&self, token_hash: &str) -> Result<Session, DatabaseError> {
        sqlx::query_as(
            "SELECT id, user_id, token_hash, expires_at, created_at FROM sessions WHERE token_hash = $1 LIMIT 1;"
        )
            .bind(token_hash)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn create(&self, session: SessionCreate) -> Result<Session, DatabaseError> {
        sqlx::query_as(
            "
            INSERT INTO sessions (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, token_hash, expires_at, created_at;
            ",
        )
            .bind(&session.user_id)
            .bind(&session.token_hash)
            .bind(&session.expires_at)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let result = sqlx::query("DELETE FROM sessions WHERE id = $1;")
            .bind(id)
            .execute(self.db)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn delete_by_token_hash(&self, token_hash: &str) -> Result<(), DatabaseError> {
        let result = sqlx::query("DELETE FROM sessions WHERE token_hash = $1;")
            .bind(token_hash)
            .execute(self.db)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn delete_all_for_user(&self, user_id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM sessions WHERE user_id = $1;")
            .bind(user_id)
            .execute(self.db)
            .await?;

        Ok(())
    }
}