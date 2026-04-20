use chrono::{DateTime, Utc};
use database::models::{
    import_row::{DiffEntry, ImportRow, ImportRowStatus, ImportWarning},
    import_session::{ImportMapping, ImportSession, ImportSessionStatus},
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use utoipa::ToSchema;
use uuid::Uuid;

// ── Response DTOs ──────────────────────────────────────────────────────────────

/// Response representation of an import session.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportSessionResponse {
    pub id: Uuid,
    pub entity_type: String,
    pub filename: String,
    pub original_headers: Vec<String>,
    pub mapping: ImportMapping,
    pub status: ImportSessionStatus,
    pub row_count: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub committed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}

impl From<ImportSession> for ImportSessionResponse {
    fn from(session: ImportSession) -> Self {
        Self {
            id: session.id,
            entity_type: session.entity_type,
            filename: session.filename,
            original_headers: session.original_headers,
            mapping: session.mapping.0,
            status: session.status,
            row_count: session.row_count,
            created_by: session.created_by,
            created_at: session.created_at,
            updated_at: session.updated_at,
            committed_at: session.committed_at,
            error: session.error,
        }
    }
}

/// Response representation of an import row.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportRowResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub row_number: i32,
    #[schema(value_type = Object)]
    pub raw_data: BTreeMap<String, Option<String>>,
    #[schema(value_type = Object)]
    pub overrides: BTreeMap<String, serde_json::Value>,
    #[schema(value_type = Object)]
    pub resolved_refs: BTreeMap<String, Option<Uuid>>,
    pub status: ImportRowStatus,
    pub target_entity_id: Option<Uuid>,
    #[schema(value_type = Option<Object>)]
    pub diff: Option<BTreeMap<String, DiffEntry>>,
    #[schema(value_type = Vec<Object>)]
    pub warnings: Vec<ImportWarning>,
}

impl From<ImportRow> for ImportRowResponse {
    fn from(row: ImportRow) -> Self {
        Self {
            id: row.id,
            session_id: row.session_id,
            row_number: row.row_number,
            raw_data: row.raw_data.0,
            overrides: row.overrides.0,
            resolved_refs: row.resolved_refs.0,
            status: row.status,
            target_entity_id: row.target_entity_id,
            diff: row.diff.map(|d| d.0),
            warnings: row.warnings.0,
        }
    }
}

/// Response returned after a CSV file is uploaded (POST /import/sessions).
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UploadResponse {
    pub session_id: Uuid,
    pub headers: Vec<String>,
    #[schema(value_type = Vec<Object>)]
    pub preview: Vec<BTreeMap<String, Option<String>>>,
    pub row_count: i64,
}

// ── Request DTOs ───────────────────────────────────────────────────────────────

/// Request body for PATCH /import/sessions/:id/mapping.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateMappingRequest {
    pub mapping: ImportMapping,
}

/// Request body for PATCH /import/rows/:id.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateRowRequest {
    #[schema(value_type = Option<Object>)]
    pub overrides: Option<BTreeMap<String, serde_json::Value>>,
    pub resolved_refs: Option<BTreeMap<String, Option<Uuid>>>,
    pub skip: Option<bool>,
}
