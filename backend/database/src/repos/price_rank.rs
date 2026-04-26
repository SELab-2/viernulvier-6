use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::price_rank::{PriceRank, PriceRankCreate},
};

pub struct PriceRankRepo<'a> {
    db: &'a PgPool,
}

impl<'a> PriceRankRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<PriceRank, DatabaseError> {
        PriceRank::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<PriceRank>, DatabaseError> {
        Ok(PriceRank::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, rank: PriceRankCreate) -> Result<PriceRank, DatabaseError> {
        Ok(rank.insert(self.db).await?)
    }

    pub async fn update(&self, rank: PriceRank) -> Result<PriceRank, DatabaseError> {
        Ok(rank.update_all_fields(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<PriceRank>, DatabaseError> {
        Ok(PriceRank::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }
}
