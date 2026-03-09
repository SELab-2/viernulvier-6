use ormlite::Model;
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
        User::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn by_email(&self, email: &str) -> Result<User, DatabaseError> {
        User::select()
            .where_("email = $1")
            .bind(email)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn create(&self, user: UserCreate) -> Result<User, DatabaseError> {
        let model = sqlx::query_as::<_, User>(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *"
        )
        .bind(user.username)
        .bind(user.email)
        .bind(user.password_hash)
        .fetch_one(self.db)
        .await?;
        Ok(model)
    }

    pub async fn patch(&self, user_id: Uuid, patch_user: UserPatch) -> Result<User, DatabaseError> {
        let mut user = self.by_id(user_id).await?;
        user.username = patch_user.username;
        Ok(user.update_all_fields(self.db).await?)
    }
}
