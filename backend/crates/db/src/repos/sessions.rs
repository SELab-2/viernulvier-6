use ormlite::{Insert, Model};
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
        Session::select()
            .where_("token_hash = $1")
            .bind(token_hash)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn create(&self, session: SessionCreate) -> Result<Session, DatabaseError> {
        Ok(session.insert(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let rows = sqlx::query("DELETE FROM sessions WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?
            .rows_affected();

        if rows == 0 {
            return Err(DatabaseError::NotFound);
        }
        Ok(())
    }

    pub async fn delete_by_token_hash(&self, token_hash: &str) -> Result<(), DatabaseError> {
        let rows = sqlx::query("DELETE FROM sessions WHERE token_hash = $1")
            .bind(token_hash)
            .execute(self.db)
            .await?
            .rows_affected();

        if rows == 0 {
            return Err(DatabaseError::NotFound);
        }
        Ok(())
    }

    pub async fn delete_all_for_user(&self, user_id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM sessions WHERE user_id = $1")
            .bind(user_id)
            .execute(self.db)
            .await?;

        Ok(())
    }
}
