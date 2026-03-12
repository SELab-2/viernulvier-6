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

    pub async fn update(&self, production: Production) -> Result<Production, DatabaseError> {
        Ok(production.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM productions WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await?;

        Ok(())
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Production>, DatabaseError> {
    Ok(Production::select()
        .where_("source_id = $1")
        .bind(source_id)
        .fetch_optional(self.db)
        .await?)
}
}
