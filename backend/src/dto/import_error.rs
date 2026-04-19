use base64::{Engine, prelude::BASE64_URL_SAFE};
use chrono::{DateTime, Utc};
use database::{Database, models::import_error::ImportError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{dto::paginated::PaginatedResponse, error::AppError};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportErrorPayload {
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

impl From<ImportError> for ImportErrorPayload {
    fn from(value: ImportError) -> Self {
        Self {
            id: value.id,
            created_at: value.created_at,
            updated_at: value.updated_at,
            last_seen_at: value.last_seen_at,
            resolved_at: value.resolved_at,
            run_id: value.run_id,
            severity: value.severity,
            entity: value.entity,
            source_id: value.source_id,
            error_kind: value.error_kind,
            field: value.field,
            relation: value.relation,
            relation_source_id: value.relation_source_id,
            message: value.message,
            payload: value.payload,
        }
    }
}

impl ImportErrorPayload {
    pub async fn all(
        db: &Database,
        cursor: Option<String>,
        limit: usize,
        resolved: bool,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let cursor = cursor.and_then(|cursor| decode_cursor(&cursor));
        let mut errors = db.import_errors().all(limit + 1, cursor, resolved).await?;
        let next_cursor = if errors.len() == limit + 1 {
            errors.pop();
            errors.last().map(encode_cursor)
        } else {
            None
        };

        Ok(PaginatedResponse {
            data: errors.into_iter().map(Self::from).collect(),
            next_cursor,
        })
    }
}

fn decode_cursor(cursor: &str) -> Option<(DateTime<Utc>, Uuid)> {
    let decoded = BASE64_URL_SAFE.decode(cursor).ok()?;
    let decoded = String::from_utf8(decoded).ok()?;
    let (timestamp, id) = decoded.split_once('|')?;
    let last_seen_at = DateTime::parse_from_rfc3339(timestamp)
        .ok()?
        .with_timezone(&Utc);
    let id = Uuid::parse_str(id).ok()?;
    Some((last_seen_at, id))
}

fn encode_cursor(error: &ImportError) -> String {
    BASE64_URL_SAFE.encode(format!("{}|{}", error.last_seen_at.to_rfc3339(), error.id))
}
