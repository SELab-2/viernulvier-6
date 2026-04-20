//! Background worker that polls for pending import sessions and processes them.
//!
//! The worker runs in a detached tokio task, claiming one session at a time
//! and dispatching to the appropriate processor. A 1-second sleep between
//! iterations keeps the poll rate low without needing a notification channel.
//!
//! `process_dry_run` and `process_commit` are stubs for Tasks 7.2 / 7.3.

use database::Database;
use database::models::import_session::ImportSessionStatus;
use tokio::time::{Duration, sleep};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::error::AppError;
use crate::import::ImportRegistry;

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
    let Some(id) = ctx
        .db
        .imports()
        .claim_next_job()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    else {
        return Ok(None);
    };

    // Fetch the session so we know which status to dispatch on.
    // If the session was cancelled between claim and fetch, log and skip.
    let Some(session) = ctx
        .db
        .imports()
        .get_session(id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    else {
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

// ─── Stub processors (replaced in Tasks 7.2 / 7.3) ──────────────────────────

/// Placeholder dry-run processor.
///
/// Immediately advances the session to `dry_run_ready`.
/// Task 7.2 will replace this with real row-level processing.
async fn process_dry_run(id: Uuid, ctx: &WorkerContext) -> Result<(), AppError> {
    ctx.db
        .imports()
        .update_status(id, ImportSessionStatus::DryRunReady, None)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}

/// Placeholder commit processor.
///
/// Immediately advances the session to `committed`.
/// Task 7.3 will replace this with real row-level commit logic.
async fn process_commit(id: Uuid, ctx: &WorkerContext) -> Result<(), AppError> {
    ctx.db
        .imports()
        .update_status(id, ImportSessionStatus::Committed, None)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}
