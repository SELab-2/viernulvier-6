use ormlite::Model;
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
        Ok(sqlx::query_as::<_, PriceRank>(
            "INSERT INTO price_ranks (source_id, created_at, updated_at, description_nl, description_en, code, position, sold_out_buffer)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (source_id) DO UPDATE SET
                 created_at      = EXCLUDED.created_at,
                 updated_at      = EXCLUDED.updated_at,
                 description_nl  = EXCLUDED.description_nl,
                 description_en  = EXCLUDED.description_en,
                 code            = EXCLUDED.code,
                 position        = EXCLUDED.position,
                 sold_out_buffer = EXCLUDED.sold_out_buffer
             RETURNING *",
        )
        .bind(rank.source_id)
        .bind(rank.created_at)
        .bind(rank.updated_at)
        .bind(&rank.description_nl)
        .bind(&rank.description_en)
        .bind(&rank.code)
        .bind(rank.position)
        .bind(rank.sold_out_buffer)
        .fetch_one(self.db)
        .await?)
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
