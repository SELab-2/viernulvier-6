use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::space::{Space, SpaceCreate},
};

pub struct SpaceRepo<'a> {
    db: &'a PgPool,
}

impl<'a> SpaceRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Space, DatabaseError> {
        Space::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Space>, DatabaseError> {
        Ok(Space::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, space: SpaceCreate) -> Result<Space, DatabaseError> {
        Ok(space.insert(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Space, DatabaseError> {
        Space::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }
}
