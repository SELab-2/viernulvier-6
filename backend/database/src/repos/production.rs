use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::production::{Production, ProductionCreate},
};

pub struct ProductionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ProductionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Production, DatabaseError> {
        Production::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Production>, DatabaseError> {
        Ok(Production::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, production: ProductionCreate) -> Result<Production, DatabaseError> {
        Ok(production.insert(self.db).await?)
    }
}
