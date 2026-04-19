use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use std::collections::BTreeMap;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ImportRowStatus {
    Pending,
    WillCreate,
    WillUpdate,
    WillSkip,
    Error,
    Created,
    Updated,
    Skipped,
    Reverted,
}

pub type RawCell = Option<String>;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportWarning {
    pub field: Option<String>,
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DiffEntry {
    pub current: Option<serde_json::Value>,
    pub incoming: Option<serde_json::Value>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize, ToSchema)]
pub struct ImportRow {
    pub id: Uuid,
    pub session_id: Uuid,
    pub row_number: i32,
    #[schema(value_type = Object)]
    pub raw_data: Json<BTreeMap<String, RawCell>>,
    #[schema(value_type = Object)]
    pub overrides: Json<BTreeMap<String, serde_json::Value>>,
    #[schema(value_type = Object)]
    pub resolved_refs: Json<BTreeMap<String, Option<Uuid>>>,
    pub status: ImportRowStatus,
    pub target_entity_id: Option<Uuid>,
    #[schema(value_type = Option<Object>)]
    pub diff: Option<Json<BTreeMap<String, DiffEntry>>>,
    #[schema(value_type = Vec<Object>)]
    pub warnings: Json<Vec<ImportWarning>>,
}
