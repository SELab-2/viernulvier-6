//! Background worker that polls for pending import sessions and processes them.
//!
//! The worker runs in a detached tokio task, claiming one session at a time
//! and dispatching to the appropriate processor. A 1-second sleep between
//! iterations keeps the poll rate low without needing a notification channel.

use std::collections::BTreeMap;

use database::Database;
use database::models::import_row::{ImportRowStatus, ImportWarning, RawCell};
use database::models::import_session::ImportSessionStatus;
use database::repos::import::NewImportRow;
use sqlx::types::Json;
use tokio::time::{Duration, sleep};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::error::AppError;
use crate::import::csv_parser;
use crate::import::{ImportRegistry, storage};

/// Effectively-unbounded row limit for the re-fetch after bulk insert.
/// `get_rows` requires a `limit`; we want all rows.
const FETCH_ALL_ROWS: i64 = i64::MAX;

// ─── Context ─────────────────────────────────────────────────────────────────

/// All dependencies the worker needs to process a job.
#[derive(Clone)]
pub struct WorkerContext {
    pub db: Database,
    pub registry: ImportRegistry,
    pub s3_client: Option<aws_sdk_s3::Client>,
    pub s3_bucket: Option<String>,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Run exactly one polling iteration: claim a job, dispatch it, and return.
///
/// Returns `Ok(None)` when no pending job is available.
/// Returns `Ok(Some(id))` after successfully dispatching a job.
pub async fn run_one_iteration(ctx: &WorkerContext) -> Result<Option<Uuid>, AppError> {
    let Some(id) = ctx.db.imports().claim_next_job().await? else {
        return Ok(None);
    };

    // Fetch the session so we know which status to dispatch on.
    // If the session was cancelled between claim and fetch, log and skip.
    let Some(session) = ctx.db.imports().get_session(id).await? else {
        warn!("worker claimed session {id} but it disappeared before processing — skipping");
        return Ok(Some(id));
    };

    match session.status {
        ImportSessionStatus::DryRunPending => {
            info!("worker processing dry-run for session {id}");
            process_dry_run(id, ctx).await?;
        }
        ImportSessionStatus::Committing => {
            info!("worker processing commit for session {id}");
            process_commit(id, ctx).await?;
        }
        other => {
            warn!("worker claimed session {id} with unexpected status {other:?} — skipping");
        }
    }

    Ok(Some(id))
}

/// Spawn the long-running poll loop in a detached tokio task.
///
/// The loop calls `run_one_iteration` forever, sleeping 1 second between
/// iterations. Errors are logged but never panic the process.
pub fn spawn(ctx: WorkerContext) {
    tokio::spawn(async move {
        loop {
            match run_one_iteration(&ctx).await {
                Ok(None) => {} // nothing to do, just sleep
                Ok(Some(id)) => info!("worker finished job {id}"),
                Err(e) => error!("worker iteration error: {e}"),
            }
            sleep(Duration::from_secs(1)).await;
        }
    });
}

// ─── Processors ──────────────────────────────────────────────────────────────

/// Outer dry-run processor: fetches CSV bytes from S3, then delegates to
/// `process_dry_run_bytes`.
///
/// On any fatal S3 / config error the session is set to `Failed` and
/// `Ok(())` is returned so the worker loop does not retry.
async fn process_dry_run(id: Uuid, ctx: &WorkerContext) -> Result<(), AppError> {
    // Retrieve the S3 key.
    let file_key = if let Some(k) = ctx.db.imports().get_file_key(id).await? {
        k
    } else {
        let msg = format!("session {id} has no file key — cannot run dry-run");
        error!("{msg}");
        ctx.db
            .imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await?;
        return Ok(());
    };

    // Ensure S3 client and bucket are configured.
    let (s3_client, s3_bucket) = if let (Some(c), Some(b)) = (&ctx.s3_client, &ctx.s3_bucket) {
        (c, b.as_str())
    } else {
        let msg = "S3 client or bucket not configured — cannot fetch CSV".to_string();
        error!("{msg}");
        ctx.db
            .imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await?;
        return Ok(());
    };

    let bytes = match storage::get_csv(s3_client, s3_bucket, &file_key).await {
        Ok(b) => b,
        Err(e) => {
            let msg = format!("failed to fetch CSV from S3: {e}");
            error!("{msg}");
            ctx.db
                .imports()
                .update_status(id, ImportSessionStatus::Failed, Some(msg))
                .await?;
            return Ok(());
        }
    };

    process_dry_run_bytes(id, &bytes, ctx).await
}

/// Inner dry-run processor: parses CSV bytes and persists per-row results.
///
/// `pub` so integration tests can call it without requiring a live S3 bucket.
pub async fn process_dry_run_bytes(
    id: Uuid,
    csv_bytes: &[u8],
    ctx: &WorkerContext,
) -> Result<(), AppError> {
    let db = &ctx.db;

    // ── Step 1: load session ─────────────────────────────────────────────────

    let session = if let Some(s) = db.imports().get_session(id).await? {
        s
    } else {
        let msg = format!("session {id} not found");
        error!("{msg}");
        // Best-effort status update — session may already be gone.
        let _ = db
            .imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await;
        return Ok(());
    };

    // ── Step 2: look up adapter ──────────────────────────────────────────────

    let adapter = if let Some(a) = ctx.registry.get(&session.entity_type) {
        a
    } else {
        let msg = format!(
            "no adapter registered for entity type '{}'",
            session.entity_type
        );
        error!("{msg}");
        db.imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await?;
        return Ok(());
    };

    // ── Step 3: parse CSV ────────────────────────────────────────────────────

    let raw_rows = match csv_parser::parse_all(csv_bytes) {
        Ok(rows) => rows,
        Err(e) => {
            let msg = format!("CSV parse error: {e}");
            error!("{msg}");
            db.imports()
                .update_status(id, ImportSessionStatus::Failed, Some(msg))
                .await?;
            return Ok(());
        }
    };

    // ── Step 4: delete existing rows (idempotency) ───────────────────────────

    if let Err(e) = db.imports().delete_rows(id).await {
        let msg = format!("failed to delete existing rows: {e}");
        error!("{msg}");
        db.imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await?;
        return Ok(());
    }

    // ── Step 5: bulk-insert fresh rows ───────────────────────────────────────

    let new_rows: Vec<NewImportRow> = raw_rows
        .iter()
        .enumerate()
        .map(|(idx, row)| {
            // RawRow (BTreeMap<String, Option<String>>) and RawCell (Option<String>)
            // are the same structural type — cast directly.
            let raw_data: BTreeMap<String, RawCell> = row.clone();
            NewImportRow {
                row_number: (idx + 1) as i32,
                raw_data: Json(raw_data),
            }
        })
        .collect();

    if let Err(e) = db.imports().insert_rows(id, &new_rows).await {
        let msg = format!("failed to insert rows: {e}");
        error!("{msg}");
        db.imports()
            .update_status(id, ImportSessionStatus::Failed, Some(msg))
            .await?;
        return Ok(());
    }

    // ── Step 6: re-fetch inserted rows to obtain their UUIDs ─────────────────

    let inserted_rows = match db.imports().get_rows(id, FETCH_ALL_ROWS, 0, None).await {
        Ok(rows) => rows,
        Err(e) => {
            let msg = format!("failed to fetch inserted rows: {e}");
            error!("{msg}");
            db.imports()
                .update_status(id, ImportSessionStatus::Failed, Some(msg))
                .await?;
            return Ok(());
        }
    };

    let mapping = &session.mapping.0;

    // ── Step 7: process each row ─────────────────────────────────────────────

    for row in &inserted_rows {
        let raw = &row.raw_data.0;

        // (a) Resolve FK references.
        let reference_resolution = match adapter.resolve_references(raw, db).await {
            Ok(r) => r,
            Err(e) => {
                let warnings = vec![ImportWarning {
                    field: None,
                    code: "adapter_error".to_string(),
                    message: e.to_string(),
                }];
                let _ = db
                    .imports()
                    .save_dry_run_result(row.id, ImportRowStatus::Error, None, Json(warnings))
                    .await;
                continue;
            }
        };

        // (b) Convert to BTreeMap<String, Option<Uuid>> — pick top suggestion per column.
        let resolved_refs: BTreeMap<String, Option<Uuid>> = reference_resolution
            .per_column
            .iter()
            .map(|(col, suggestions)| {
                let id = suggestions.first().map(|s| s.id);
                (col.clone(), id)
            })
            .collect();

        // (d) Build resolved row BEFORE persisting refs — build_resolved_row borrows.
        let overrides = &row.overrides.0;
        let resolved_row =
            crate::handlers::import::build_resolved_row(raw, mapping, overrides, &resolved_refs);

        // (c) Persist resolved refs (consumes resolved_refs).
        if let Err(e) = db
            .imports()
            .update_row_resolved_refs(row.id, Json(resolved_refs))
            .await
        {
            let warnings = vec![ImportWarning {
                field: None,
                code: "adapter_error".to_string(),
                message: e.to_string(),
            }];
            let _ = db
                .imports()
                .save_dry_run_result(row.id, ImportRowStatus::Error, None, Json(warnings))
                .await;
            continue;
        }

        // (e) Validate.
        let warnings = adapter.validate_row(&resolved_row);

        // (f) Look up existing entity.
        let existing_id = match adapter.lookup_existing(&resolved_row, db).await {
            Ok(opt) => opt,
            Err(e) => {
                let err_warnings = vec![ImportWarning {
                    field: None,
                    code: "adapter_error".to_string(),
                    message: e.to_string(),
                }];
                let _ = db
                    .imports()
                    .save_dry_run_result(row.id, ImportRowStatus::Error, None, Json(err_warnings))
                    .await;
                continue;
            }
        };

        // (g) Determine status and compute diff if updating.
        let (status, diff) = match existing_id {
            Some(entity_id) => match adapter.build_diff(entity_id, &resolved_row, db).await {
                Ok(d) => (ImportRowStatus::WillUpdate, Some(Json(d))),
                Err(e) => {
                    let err_warnings = vec![ImportWarning {
                        field: None,
                        code: "adapter_error".to_string(),
                        message: e.to_string(),
                    }];
                    let _ = db
                        .imports()
                        .save_dry_run_result(
                            row.id,
                            ImportRowStatus::Error,
                            None,
                            Json(err_warnings),
                        )
                        .await;
                    continue;
                }
            },
            None => (ImportRowStatus::WillCreate, None),
        };

        // (h) Persist dry-run result.
        if let Err(e) = db
            .imports()
            .save_dry_run_result(row.id, status, diff, Json(warnings))
            .await
        {
            warn!("failed to persist dry-run result for row {}: {e}", row.id);
        }
    }

    // ── Step 8: mark session as dry_run_ready ────────────────────────────────

    db.imports()
        .update_status(id, ImportSessionStatus::DryRunReady, None)
        .await?;

    Ok(())
}

/// Placeholder commit processor.
///
/// Immediately advances the session to `committed`.
/// Task 7.3 will replace this with real row-level commit logic.
async fn process_commit(id: Uuid, ctx: &WorkerContext) -> Result<(), AppError> {
    ctx.db
        .imports()
        .update_status(id, ImportSessionStatus::Committed, None)
        .await?;
    Ok(())
}
