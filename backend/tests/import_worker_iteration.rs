//! Integration tests for the background worker iteration (Task 7.1 / 7.2).
//!
//! Covered:
//! 1. worker_claims_dry_run_pending_session — worker claims the session and
//!    dispatches it (session transitions away from dry_run_pending regardless
//!    of outcome — here it goes to `failed` because no S3 file key is set).
//! 2. worker_returns_none_when_queue_empty  — no pending sessions → Ok(None)

mod common;

use database::{
    Database, models::import_session::ImportSessionStatus, repos::import::CreateSession,
};
use sqlx::PgPool;
use viernulvier_archive::import::{
    default_registry,
    worker::{WorkerContext, run_one_iteration},
};

use crate::common::user::create_test_user;
use database::models::user::UserRole;

// ─── Test 1: worker claims and dispatches a dry_run_pending session ──────────
//
// The session has no S3 file key, so the real processor transitions it to
// `failed`.  The important assertion is that `run_one_iteration` returns
// `Some(session_id)` — i.e. the worker successfully claimed and dispatched the
// job — and that the session no longer sits at `dry_run_pending` afterwards.

#[sqlx::test]
async fn worker_claims_dry_run_pending_session(pool: PgPool) {
    let db = Database::new(pool);

    // Seed a user (import_sessions.created_by is FK → users).
    let user = create_test_user(&db, "worker_test1@test.com", UserRole::Editor).await;

    // Create an import session in `uploaded` status.
    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "test.csv".to_string(),
            original_headers: vec!["Titel".to_string()],
            created_by: user.id,
        })
        .await
        .expect("create_session failed");

    // Advance to dry_run_pending (as the handler would).
    db.imports()
        .update_status(session_id, ImportSessionStatus::DryRunPending, None)
        .await
        .expect("update_status failed");

    let ctx = WorkerContext {
        db: db.clone(),
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    };

    let claimed = run_one_iteration(&ctx).await.expect("iteration ok");
    assert_eq!(claimed, Some(session_id));

    // The session must have left dry_run_pending (real processor transitions to
    // failed when there is no file key).
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .unwrap()
        .expect("session not found");
    assert_ne!(
        session.status,
        ImportSessionStatus::DryRunPending,
        "session should no longer be dry_run_pending after worker dispatch"
    );
}

// ─── Test 2: no-op when queue is empty ────────────────────────────────────────

#[sqlx::test]
async fn worker_returns_none_when_queue_empty(pool: PgPool) {
    let db = Database::new(pool);

    let ctx = WorkerContext {
        db,
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    };

    let claimed = run_one_iteration(&ctx).await.expect("iteration ok");
    assert_eq!(claimed, None);
}
