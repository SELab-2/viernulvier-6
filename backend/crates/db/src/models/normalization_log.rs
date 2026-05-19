use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type, PartialEq, Eq)]
#[sqlx(type_name = "normalization_status", rename_all = "snake_case")]
pub enum NormalizationStatus {
    Executed,
    SkippedLowConfidence,
    SkippedError,
}

#[derive(Debug, FromRow)]
pub struct NormalizationLog {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub production_id: Option<Uuid>,
    pub action_type: String,
    pub target_entity: Option<String>,
    pub target_id: Option<Uuid>,
    pub confidence: Option<f32>,
    pub status: NormalizationStatus,
    pub payload: Value,
}

#[derive(Debug)]
pub struct NormalizationLogCreate {
    pub production_id: Option<Uuid>,
    pub action_type: String,
    pub target_entity: Option<String>,
    pub target_id: Option<Uuid>,
    pub confidence: Option<f32>,
    pub status: NormalizationStatus,
    pub payload: Value,
}
