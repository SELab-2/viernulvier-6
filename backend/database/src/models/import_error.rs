use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow, PartialEq)]
pub struct ImportError {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub run_id: Option<Uuid>,
    pub severity: String,
    pub entity: String,
    pub source_id: Option<i32>,
    pub error_kind: String,
    pub field: Option<String>,
    pub relation: Option<String>,
    pub relation_source_id: Option<i32>,
    pub message: String,
    pub payload: Option<Value>,
}

pub struct ImportErrorCreate {
    pub run_id: Option<Uuid>,
    pub severity: String,
    pub entity: String,
    pub source_id: Option<i32>,
    pub error_kind: String,
    pub field: Option<String>,
    pub relation: Option<String>,
    pub relation_source_id: Option<i32>,
    pub message: String,
    pub payload: Option<Value>,
}
