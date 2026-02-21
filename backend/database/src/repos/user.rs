use sqlx::PgPool;

use crate::{
    error::DatabaseError,
    models::user::{User, UserCreate, UserPatch},
};

pub struct UserRepo<'a> {
    db: &'a PgPool,
}

impl<'a> UserRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: i32) -> Result<User, DatabaseError> {
        sqlx::query_as("SELECT id, username FROM \"user\" WHERE id = $1 LIMIT 1;")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn create(&self, user: UserCreate) -> Result<User, DatabaseError> {
        sqlx::query_as(
            "
            INSERT INTO \"user\" (username) VALUES ($1)
            RETURNING id, username;
            ",
        )
        .bind(&user.username)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }

    pub async fn patch(&self, user_id: i32, patch_user: UserPatch) -> Result<User, DatabaseError> {
        sqlx::query_as(
            "
            UPDATE \"user\" SET username = $1 WHERE id = $2
            RETURNING id, username
            ",
        )
        .bind(patch_user.username)
        .bind(user_id)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }
}
