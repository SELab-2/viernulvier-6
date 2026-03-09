use sqlx::PgPool;
use uuid::Uuid;

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

    pub async fn by_id(&self, id: Uuid) -> Result<User, DatabaseError> {
        sqlx::query_as("SELECT id, username, email, password_hash FROM users WHERE id = $1 LIMIT 1;")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn by_email(&self, email: &str) -> Result<User, DatabaseError> {
        sqlx::query_as("SELECT id, username, email, password_hash FROM users WHERE email = $1 LIMIT 1;")
            .bind(email)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn create(&self, user: UserCreate) -> Result<User, DatabaseError> {
        sqlx::query_as(
            "
            INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
            RETURNING id, username, email, password_hash;
            ",
        )
        .bind(&user.username)
        .bind(&user.email)
        .bind(&user.password_hash)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }

    pub async fn patch(&self, user_id: Uuid, patch_user: UserPatch) -> Result<User, DatabaseError> {
        sqlx::query_as(
            "
            UPDATE users SET username = $1 WHERE id = $2
            RETURNING id, username, email, password_hash;
            ",
        )
        .bind(patch_user.username)
        .bind(user_id)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }
}
