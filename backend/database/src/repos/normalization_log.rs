use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::normalization_log::{NormalizationLogCreate, NormalizationStatus},
};

pub struct NormalizationLogRepo<'a> {
    db: &'a PgPool,
}

impl<'a> NormalizationLogRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn insert(&self, entry: NormalizationLogCreate) -> Result<Uuid, DatabaseError> {
        let id = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO normalization_log
                (production_id, action_type, target_entity, target_id, confidence, status, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id",
        )
        .bind(entry.production_id)
        .bind(&entry.action_type)
        .bind(entry.target_entity.as_deref())
        .bind(entry.target_id)
        .bind(entry.confidence)
        .bind(entry.status)
        .bind(&entry.payload)
        .fetch_one(self.db)
        .await?;

        Ok(id)
    }
}

impl NormalizationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Executed => "executed",
            Self::SkippedLowConfidence => "skipped_low_confidence",
            Self::SkippedError => "skipped_error",
        }
    }
}
