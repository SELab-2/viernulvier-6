//! Integration tests for the background worker iteration (Task 7.1).
//!
//! Covered:
//! 1. worker_advances_dry_run_pending_to_ready  — pending session → dry_run_ready after one iteration
//! 2. worker_returns_none_when_queue_empty       — no pending sessions → Ok(None)

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

// ─── Test 1: pending session advances to dry_run_ready ────────────────────────

#[sqlx::test]
async fn worker_advances_dry_run_pending_to_ready(pool: PgPool) {
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

    let session = db
        .imports()
        .get_session(session_id)
        .await
        .unwrap()
        .expect("session not found");
    assert_eq!(session.status, ImportSessionStatus::DryRunReady);
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
