use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use std::collections::BTreeMap;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ImportSessionStatus {
    Uploaded,
    Mapping,
    DryRunPending,
    DryRunReady,
    Committing,
    Committed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct ImportMapping {
    /// CSV header -> target field name (None = unmapped).
    #[serde(default)]
    pub columns: BTreeMap<String, Option<String>>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize, ToSchema)]
pub struct ImportSession {
    pub id: Uuid,
    pub entity_type: String,
    pub filename: String,
    pub original_headers: Vec<String>,
    #[schema(value_type = Object)]
    pub mapping: Json<ImportMapping>,
    pub status: ImportSessionStatus,
    pub row_count: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub committed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}
