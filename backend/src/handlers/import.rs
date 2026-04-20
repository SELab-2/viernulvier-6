use axum::{
    Json,
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
};
use database::models::import_row::{ImportRowStatus, RawCell};
use database::models::import_session::{ImportMapping, ImportSessionStatus};
use database::repos::import::CreateSession;
use serde::Deserialize;
use serde_json::Value;
use sqlx::types::Json as DbJson;
use std::collections::BTreeMap;
use tracing::warn;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::{
    AppState,
    dto::import::{
        ImportRowResponse, ImportSessionResponse, UpdateMappingRequest, UpdateRowRequest,
        UploadResponse,
    },
    error::AppError,
    extractors::auth::EditorUser,
    import::{csv_parser, storage, types::ResolvedRow},
};

// ── Query param structs ───────────────────────────────────────────────────────

#[derive(Debug, Deserialize, IntoParams)]
pub struct PaginationQuery {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_page() -> u32 {
    1
}
fn default_limit() -> u32 {
    25
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct RowsQuery {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
    pub status: Option<database::models::import_row::ImportRowStatus>,
}

const MAX_FILE_BYTES: usize = 10 * 1024 * 1024; // 10 MiB

/// POST /import/sessions — upload a CSV and create an import session.
///
/// Accepts a multipart form with two fields:
/// - `entity_type`: the target entity (e.g. "production")
/// - `file`: the CSV file
///
/// Parses a preview, uploads the raw CSV to S3, creates an `import_sessions`
/// row, and transitions its status to `mapping`.
#[utoipa::path(
    post,
    path = "/import/sessions",
    request_body(content = Vec<u8>, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "CSV uploaded and parsed", body = UploadResponse),
        (status = 400, description = "Invalid CSV, missing fields, file too large, or unsupported entity_type"),
        (status = 401, description = "Not authenticated"),
        (status = 500, description = "Internal error (S3 not configured, database error)"),
    ),
    tag = "import",
)]
pub async fn upload_session(
    State(state): State<AppState>,
    user: EditorUser,
    mut mp: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    // Step 1: consume all multipart fields
    let mut entity_type_opt: Option<String> = None;
    let mut file_bytes_opt: Option<Vec<u8>> = None;
    let mut filename_opt: Option<String> = None;

    while let Some(field) = mp
        .next_field()
        .await
        .map_err(|e| AppError::PayloadError(format!("multipart error: {e}")))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "entity_type" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| AppError::PayloadError(format!("failed to read entity_type: {e}")))?;
                entity_type_opt = Some(text);
            }
            "file" => {
                // Capture filename before consuming the field body
                filename_opt = field.file_name().map(str::to_string);

                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::PayloadError(format!("failed to read file field: {e}")))?;

                if bytes.len() > MAX_FILE_BYTES {
                    return Err(AppError::PayloadError(
                        "file exceeds 10 MiB limit".to_string(),
                    ));
                }

                file_bytes_opt = Some(bytes.to_vec());
            }
            _ => {
                // Ignore unknown fields — consume to avoid stalling the stream
                let _ = field.bytes().await;
            }
        }
    }

    let entity_type = match entity_type_opt {
        None => return Err(AppError::PayloadError("missing 'entity_type' field".to_string())),
        Some(s) if s.is_empty() => {
            return Err(AppError::PayloadError("'entity_type' field is empty".to_string()));
        }
        Some(s) => s,
    };

    let bytes = file_bytes_opt
        .ok_or_else(|| AppError::PayloadError("missing 'file' field".to_string()))?;

    // Step 2: validate entity_type
    if state.import_registry.get(&entity_type).is_none() {
        return Err(AppError::PayloadError(format!(
            "unsupported entity_type: {entity_type}"
        )));
    }

    // Step 3: parse CSV preview
    let preview = csv_parser::parse_preview(&bytes)
        .map_err(|e| AppError::PayloadError(e.to_string()))?;

    // Step 4: verify S3 is configured (before creating DB records)
    let s3_client = state
        .s3_client
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 not configured".to_string()))?;
    let s3_cfg = state
        .config
        .s3
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 not configured".to_string()))?;
    let bucket = s3_cfg.bucket.as_str();

    // Step 5: determine filename
    let filename = sanitise_filename(&filename_opt.unwrap_or_else(|| "upload.csv".to_string()));

    // Step 6: create DB session row (status = uploaded)
    let session_id = state
        .db
        .imports()
        .create_session(CreateSession {
            entity_type: entity_type.clone(),
            filename: filename.clone(),
            original_headers: preview.headers.clone(),
            created_by: user.0.id,
        })
        .await?;

    // Step 7: upload CSV to S3
    let s3_key = match storage::put_csv(s3_client, bucket, session_id, &filename, bytes).await {
        Ok(key) => key,
        Err(e) => {
            warn!(
                session_id = %session_id,
                "S3 upload failed after session created; session left in 'uploaded' state: {e}"
            );
            return Err(e);
        }
    };

    // Step 8: record S3 key
    if let Err(e) = state.db.imports().set_file_key(session_id, s3_key).await {
        warn!(
            session_id = %session_id,
            "set_file_key failed; session left in 'uploaded' state: {e}"
        );
        return Err(e.into());
    }

    // Step 9: transition to mapping
    state
        .db
        .imports()
        .update_status(session_id, ImportSessionStatus::Mapping, None)
        .await?;

    // Step 10: return preview
    Ok(Json(UploadResponse {
        session_id,
        headers: preview.headers,
        preview: preview.preview_rows,
        row_count: preview.total_rows as i64,
    }))
}

/// GET /import/sessions — list import sessions, newest first, paginated.
#[utoipa::path(
    get,
    path = "/import/sessions",
    params(PaginationQuery),
    responses((status = 200, body = Vec<ImportSessionResponse>)),
    tag = "import",
)]
pub async fn list_sessions(
    State(state): State<AppState>,
    _: EditorUser,
    Query(q): Query<PaginationQuery>,
) -> Result<Json<Vec<ImportSessionResponse>>, AppError> {
    let limit = i64::from(q.limit.clamp(1, 100));
    let offset = i64::from(q.page.saturating_sub(1).saturating_mul(q.limit));
    let sessions = state.db.imports().list_sessions(limit, offset).await?;
    Ok(Json(sessions.into_iter().map(Into::into).collect()))
}

/// GET /import/sessions/{id} — fetch a single import session by id.
#[utoipa::path(
    get,
    path = "/import/sessions/{id}",
    params(("id" = Uuid, Path, description = "Session id")),
    responses(
        (status = 200, body = ImportSessionResponse),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn get_session(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ImportSessionResponse>, AppError> {
    match state.db.imports().get_session(id).await? {
        Some(session) => Ok(Json(session.into())),
        None => Err(AppError::NotFound),
    }
}

/// GET /import/sessions/{id}/rows — list rows for a session, paginated, with optional status filter.
#[utoipa::path(
    get,
    path = "/import/sessions/{id}/rows",
    params(
        ("id" = Uuid, Path, description = "Session id"),
        RowsQuery,
    ),
    responses((status = 200, body = Vec<ImportRowResponse>)),
    tag = "import",
)]
pub async fn get_rows(
    State(state): State<AppState>,
    _: EditorUser,
    Path(session_id): Path<Uuid>,
    Query(q): Query<RowsQuery>,
) -> Result<Json<Vec<ImportRowResponse>>, AppError> {
    let limit = i64::from(q.limit.clamp(1, 500));
    let offset = i64::from(q.page.saturating_sub(1).saturating_mul(q.limit));
    let rows = state
        .db
        .imports()
        .get_rows(session_id, limit, offset, q.status)
        .await?;
    Ok(Json(rows.into_iter().map(Into::into).collect()))
}

/// PATCH /import/sessions/{id}/mapping — persist a column mapping and advance status to `mapping`.
///
/// Validates that every non-None target field name exists in the adapter's field list.
/// Rejects sessions in non-editable statuses (dry_run_pending, committing, committed, failed, cancelled).
#[utoipa::path(
    patch,
    path = "/import/sessions/{id}/mapping",
    params(("id" = Uuid, Path, description = "Session id")),
    request_body = UpdateMappingRequest,
    responses(
        (status = 200, body = ImportSessionResponse),
        (status = 400, description = "Unknown field or non-editable session status"),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn update_mapping(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMappingRequest>,
) -> Result<Json<ImportSessionResponse>, AppError> {
    // 1. Load session → 404 if missing
    let session = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 2. Check status is editable → 400 if not
    let editable = matches!(
        session.status,
        ImportSessionStatus::Uploaded
            | ImportSessionStatus::Mapping
            | ImportSessionStatus::DryRunReady
    );
    if !editable {
        let status_label = status_label(session.status);
        return Err(AppError::PayloadError(format!(
            "cannot edit mapping for session in status {status_label}"
        )));
    }

    // 3. Load adapter from registry → 500 if unknown (session was created with a valid entity_type)
    let adapter = state
        .import_registry
        .get(&session.entity_type)
        .ok_or_else(|| {
            AppError::Internal(format!(
                "no adapter registered for entity_type '{}'",
                session.entity_type
            ))
        })?;

    // 4. Validate every mapped field exists in the adapter's target_fields
    let fields = adapter.target_fields();
    let known_fields: std::collections::HashSet<&str> =
        fields.iter().map(|f| f.name.as_str()).collect();

    for field_name in body.mapping.columns.values().flatten() {
        if !known_fields.contains(field_name.as_str()) {
            return Err(AppError::PayloadError(format!(
                "unknown target field: {field_name}"
            )));
        }
    }

    // 5. Persist the mapping (also sets status = 'mapping')
    state.db.imports().save_mapping(id, body.mapping).await?;

    // 6. Re-fetch session (status is now 'mapping') and return it
    let updated = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(updated.into()))
}

/// POST /import/sessions/{id}/dry-run — enqueue a dry-run for the session.
///
/// Allowed from `mapping` or `dry_run_ready` status only.
/// Sets status to `dry_run_pending` and returns 202 Accepted.
/// The background worker (Phase 7) will pick the session up and execute the dry-run.
#[utoipa::path(
    post,
    path = "/import/sessions/{id}/dry-run",
    params(("id" = Uuid, Path, description = "Session id")),
    responses(
        (status = 202, body = ImportSessionResponse, description = "Dry-run queued"),
        (status = 400, description = "Session not in a state that allows dry-run"),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn enqueue_dry_run(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
) -> Result<(StatusCode, Json<ImportSessionResponse>), AppError> {
    // 1. Load session → 404 if missing
    let session = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 2. Allow only if status ∈ {Mapping, DryRunReady}
    let allowed = matches!(
        session.status,
        ImportSessionStatus::Mapping | ImportSessionStatus::DryRunReady
    );
    if !allowed {
        let label = status_label(session.status);
        return Err(AppError::PayloadError(format!(
            "cannot enqueue dry-run for session in status {label}"
        )));
    }

    // 3. Transition to dry_run_pending
    state
        .db
        .imports()
        .update_status(id, ImportSessionStatus::DryRunPending, None)
        .await?;

    // 4. Re-fetch and return 202
    let updated = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok((StatusCode::ACCEPTED, Json(updated.into())))
}

/// POST /import/sessions/{id}/commit — enqueue a commit for the session.
///
/// Allowed only from `dry_run_ready` status.
/// Sets status to `committing` and returns 202 Accepted.
/// The background worker (Phase 7) will pick the session up and write to the DB.
#[utoipa::path(
    post,
    path = "/import/sessions/{id}/commit",
    params(("id" = Uuid, Path, description = "Session id")),
    responses(
        (status = 202, body = ImportSessionResponse, description = "Commit queued"),
        (status = 400, description = "Session is not in dry_run_ready state"),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn enqueue_commit(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
) -> Result<(StatusCode, Json<ImportSessionResponse>), AppError> {
    // 1. Load session → 404 if missing
    let session = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 2. Allow only if status == DryRunReady
    if session.status != ImportSessionStatus::DryRunReady {
        let label = status_label(session.status);
        return Err(AppError::PayloadError(format!(
            "cannot enqueue commit for session in status {label}"
        )));
    }

    // 3. Transition to committing
    state
        .db
        .imports()
        .update_status(id, ImportSessionStatus::Committing, None)
        .await?;

    // 4. Re-fetch and return 202
    let updated = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok((StatusCode::ACCEPTED, Json(updated.into())))
}

/// PATCH /import/rows/{id} — update a row's overrides / resolved_refs / skip flag and
/// synchronously re-validate it.
///
/// Allowed when the session is in `uploaded`, `mapping`, or `dry_run_ready` status.
/// Sessions in `dry_run_pending`, `committing`, `committed`, `failed`, or `cancelled`
/// state are rejected with 400.
#[utoipa::path(
    patch,
    path = "/import/rows/{id}",
    params(("id" = Uuid, Path, description = "Row id")),
    request_body = UpdateRowRequest,
    responses(
        (status = 200, body = ImportRowResponse),
        (status = 400, description = "Adapter rejected the row or session not in editable state"),
        (status = 404, description = "Row or session not found"),
    ),
    tag = "import",
)]
pub async fn update_row(
    State(state): State<AppState>,
    _: EditorUser,
    Path(row_id): Path<Uuid>,
    Json(body): Json<UpdateRowRequest>,
) -> Result<Json<ImportRowResponse>, AppError> {
    let repo = state.db.imports();

    // 1. Load row → 404 if missing
    let row = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;

    // 2. Load session → 404 if missing (shouldn't happen — FK)
    let session = repo
        .get_session(row.session_id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 3. Check session status is editable
    match session.status {
        ImportSessionStatus::Uploaded
        | ImportSessionStatus::Mapping
        | ImportSessionStatus::DryRunReady => {} // allowed
        ImportSessionStatus::DryRunPending => {
            return Err(AppError::PayloadError(
                "row is being dry-run; try again later".to_string(),
            ));
        }
        other => {
            let label = status_label(other);
            return Err(AppError::PayloadError(format!(
                "cannot edit row for session in status {label}"
            )));
        }
    }

    // 4. Load adapter from registry → 500 if unknown
    let adapter = state
        .import_registry
        .get(&session.entity_type)
        .ok_or_else(|| {
            AppError::Internal(format!(
                "no adapter registered for entity_type '{}'",
                session.entity_type
            ))
        })?;

    // 5. Persist overrides if supplied
    if let Some(ref overrides) = body.overrides {
        repo.update_row_overrides(row_id, DbJson(overrides.clone()))
            .await?;
    }

    // 6. Persist resolved_refs if supplied
    if let Some(ref resolved_refs) = body.resolved_refs {
        repo.update_row_resolved_refs(row_id, DbJson(resolved_refs.clone()))
            .await?;
    }

    // 7. Handle skip flag
    if body.skip == Some(true) {
        repo.mark_row_skipped(row_id).await?;
        let updated = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;
        return Ok(Json(updated.into()));
    }
    // skip == Some(false) with WillSkip status falls through to re-validate (un-skip by re-validating)

    // 8. Re-fetch row to get latest overrides / resolved_refs
    let row = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;

    // 9. Build ResolvedRow
    let resolved = build_resolved_row(
        &row.raw_data.0,
        &session.mapping.0,
        &row.overrides.0,
        &row.resolved_refs.0,
    );

    // 10. Validate
    let warnings = adapter.validate_row(&resolved);

    // 11. Lookup existing entity
    let existing_id = adapter
        .lookup_existing(&resolved, &state.db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // 12. Determine status and build diff
    let (status, diff) = match existing_id {
        Some(id) => {
            let diff = adapter
                .build_diff(id, &resolved, &state.db)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            (ImportRowStatus::WillUpdate, Some(DbJson(diff)))
        }
        None => (ImportRowStatus::WillCreate, None),
    };

    // 13. Persist dry-run result
    repo.save_dry_run_result(row_id, status, diff, DbJson(warnings))
        .await?;

    // 14. Re-fetch and return
    let final_row = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(final_row.into()))
}

/// POST /import/sessions/{id}/rollback — iterate committed rows in reverse and revert each one.
///
/// Allowed from `committed` or `failed` status.  Partial failures are tolerated: the row keeps
/// its current status and a `revert_failed` warning is appended.  The session ends in `cancelled`.
#[utoipa::path(
    post,
    path = "/import/sessions/{id}/rollback",
    params(("id" = Uuid, Path, description = "Session id")),
    responses(
        (status = 200, body = ImportSessionResponse, description = "Rollback completed (possibly with per-row failures)"),
        (status = 400, description = "Session not in a rollback-eligible state"),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn rollback_session(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ImportSessionResponse>, AppError> {
    // 1. Load session → 404 if missing
    let session = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 2. Only committed or failed sessions can be rolled back
    let eligible = matches!(
        session.status,
        ImportSessionStatus::Committed | ImportSessionStatus::Failed
    );
    if !eligible {
        let label = status_label(session.status);
        return Err(AppError::PayloadError(format!(
            "cannot rollback session in status {label}"
        )));
    }

    // 3. Load adapter from registry → 500 if missing
    let adapter = state
        .import_registry
        .get(&session.entity_type)
        .ok_or_else(|| {
            AppError::Internal(format!(
                "no adapter registered for entity_type '{}'",
                session.entity_type
            ))
        })?;

    // 4. Fetch all rows and filter to those that were committed (created/updated), reversed
    let all_rows = state
        .db
        .imports()
        .get_rows(id, 10_000, 0, None)
        .await?;

    let mut committed_rows: Vec<_> = all_rows
        .into_iter()
        .filter(|r| {
            matches!(r.status, database::models::import_row::ImportRowStatus::Created | database::models::import_row::ImportRowStatus::Updated)
        })
        .collect();

    // reverse order so last-applied rows are reverted first
    committed_rows.reverse();

    // 5. Revert each row
    let repo = state.db.imports();
    for row in committed_rows {
        if let Some(entity_id) = row.target_entity_id {
            let mut tx = state
                .db
                .begin_transaction()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            match adapter.revert_row(entity_id, &state.db, &mut tx).await {
                Ok(()) => {
                    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
                    repo.record_reverted_row(row.id).await?;
                }
                Err(e) => {
                    let _ = tx.rollback().await;
                    // Append warning to the row; keep its status
                    let mut warnings = row.warnings.0.clone();
                    warnings.push(database::models::import_row::ImportWarning {
                        field: None,
                        code: "revert_failed".to_string(),
                        message: e.to_string(),
                    });
                    repo.save_dry_run_result(
                        row.id,
                        row.status,
                        row.diff.clone(),
                        DbJson(warnings),
                    )
                    .await?;
                }
            }
        }
    }

    // 6. Mark session as cancelled
    repo.update_status(id, ImportSessionStatus::Cancelled, None).await?;

    // 7. Re-fetch and return
    let updated = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(updated.into()))
}

/// POST /import/rows/{id}/revert — revert a single committed row.
///
/// The row must be in `created` or `updated` status and must have a `target_entity_id`.
/// Failure surfaces as 500 (unlike session rollback which tolerates partial failures).
#[utoipa::path(
    post,
    path = "/import/rows/{id}/revert",
    params(("id" = Uuid, Path, description = "Row id")),
    responses(
        (status = 200, body = ImportRowResponse),
        (status = 400, description = "Row is not in a revert-eligible state"),
        (status = 404, description = "Row not found"),
    ),
    tag = "import",
)]
pub async fn revert_row(
    State(state): State<AppState>,
    _: EditorUser,
    Path(row_id): Path<Uuid>,
) -> Result<Json<ImportRowResponse>, AppError> {
    let repo = state.db.imports();

    // 1. Load row → 404
    let row = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;

    // 2. Load session (for entity_type) → 404
    let session = repo
        .get_session(row.session_id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 3. Require row in Created/Updated status with a target entity
    let revertible = matches!(
        row.status,
        database::models::import_row::ImportRowStatus::Created
            | database::models::import_row::ImportRowStatus::Updated
    );
    let entity_id = match (revertible, row.target_entity_id) {
        (true, Some(eid)) => eid,
        (false, _) => {
            return Err(AppError::PayloadError(format!(
                "row is not in a revert-eligible state (status: {:?})",
                row.status
            )));
        }
        (true, None) => {
            return Err(AppError::PayloadError(
                "row has no target_entity_id; cannot revert".to_string(),
            ));
        }
    };

    // 4. Load adapter → 500 if missing
    let adapter = state
        .import_registry
        .get(&session.entity_type)
        .ok_or_else(|| {
            AppError::Internal(format!(
                "no adapter registered for entity_type '{}'",
                session.entity_type
            ))
        })?;

    // 5. Open transaction and revert
    let mut tx = state
        .db
        .begin_transaction()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    match adapter.revert_row(entity_id, &state.db, &mut tx).await {
        Ok(()) => {
            tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
            repo.record_reverted_row(row_id).await?;
        }
        Err(e) => {
            let _ = tx.rollback().await;
            return Err(AppError::Internal(format!("revert failed: {e}")));
        }
    }

    // 6. Re-fetch and return
    let final_row = repo.get_row(row_id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(final_row.into()))
}

/// DELETE /import/sessions/{id} — cancel a session that has not been committed.
///
/// Refused if status ∈ {Committing, Committed, Cancelled}.  Cancelled sessions remain in the DB
/// for audit purposes.
#[utoipa::path(
    delete,
    path = "/import/sessions/{id}",
    params(("id" = Uuid, Path, description = "Session id")),
    responses(
        (status = 204, description = "Session cancelled"),
        (status = 400, description = "Session is already committed or being committed"),
        (status = 404, description = "Session not found"),
    ),
    tag = "import",
)]
pub async fn cancel_session(
    State(state): State<AppState>,
    _: EditorUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    // 1. Load session → 404
    let session = state
        .db
        .imports()
        .get_session(id)
        .await?
        .ok_or(AppError::NotFound)?;

    // 2. Refuse if already committed, committing, or cancelled
    let blocked = matches!(
        session.status,
        ImportSessionStatus::Committing
            | ImportSessionStatus::Committed
            | ImportSessionStatus::Cancelled
    );
    if blocked {
        let label = status_label(session.status);
        return Err(AppError::PayloadError(format!(
            "cannot cancel session in status {label}"
        )));
    }

    // 3. Transition to cancelled
    state
        .db
        .imports()
        .update_status(id, ImportSessionStatus::Cancelled, None)
        .await?;

    // 4. 204 No Content
    Ok(StatusCode::NO_CONTENT)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Build a `ResolvedRow` from raw CSV data, the session column mapping, any
/// user-supplied overrides, and pre-resolved FK references.
///
/// Algorithm:
/// 1. For every `(header, Some(field_name))` in the mapping, take the raw value
///    (an `Option<String>`) and convert it to a `Value` (`None` → `Null`,
///    `Some(s)` → `String(s)`).
/// 2. Apply overrides: any `(field, value)` pair replaces the mapped value.
/// 3. Apply resolved refs: `Some(uuid)` → `String(uuid.to_string())`;
///    `None` → `Null`.
///
/// `pub(crate)` so the Phase-7 background worker can reuse it.
pub(crate) fn build_resolved_row(
    raw: &BTreeMap<String, RawCell>,
    mapping: &ImportMapping,
    overrides: &BTreeMap<String, Value>,
    resolved_refs: &BTreeMap<String, Option<Uuid>>,
) -> ResolvedRow {
    let mut row: ResolvedRow = BTreeMap::new();

    // Step 1: mapped raw values
    for (header, maybe_field) in &mapping.columns {
        if let Some(field_name) = maybe_field {
            let val = match raw.get(header) {
                Some(Some(s)) => Value::String(s.clone()),
                _ => Value::Null,
            };
            row.insert(field_name.clone(), val);
        }
    }

    // Step 2: overrides
    for (field_name, value) in overrides {
        row.insert(field_name.clone(), value.clone());
    }

    // Step 3: resolved refs
    for (field_name, maybe_uuid) in resolved_refs {
        let val = match maybe_uuid {
            Some(uuid) => Value::String(uuid.to_string()),
            None => Value::Null,
        };
        row.insert(field_name.clone(), val);
    }

    row
}

/// Strip control characters (including newlines and null bytes) from a raw
/// filename supplied by the user, then truncate to 255 code-points.
/// Falls back to `"upload.csv"` if the result would be empty.
fn sanitise_filename(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| !c.is_control())
        .take(255)
        .collect();
    if cleaned.is_empty() {
        "upload.csv".to_string()
    } else {
        cleaned
    }
}

fn status_label(status: ImportSessionStatus) -> &'static str {
    match status {
        ImportSessionStatus::Uploaded => "uploaded",
        ImportSessionStatus::Mapping => "mapping",
        ImportSessionStatus::DryRunPending => "dry_run_pending",
        ImportSessionStatus::DryRunReady => "dry_run_ready",
        ImportSessionStatus::Committing => "committing",
        ImportSessionStatus::Committed => "committed",
        ImportSessionStatus::Failed => "failed",
        ImportSessionStatus::Cancelled => "cancelled",
    }
}
