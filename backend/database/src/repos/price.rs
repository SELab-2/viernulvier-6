use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::price::{Price, PriceCreate},
};

pub struct PriceRepo<'a> {
    db: &'a PgPool,
}

impl<'a> PriceRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Price, DatabaseError> {
        Price::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Price>, DatabaseError> {
        Ok(Price::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, price: PriceCreate) -> Result<Price, DatabaseError> {
        Ok(price.insert(self.db).await?)
    }

    pub async fn update(&self, price: Price) -> Result<Price, DatabaseError> {
        Ok(price.update_all_fields(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Price>, DatabaseError> {
        Ok(Price::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }
}
