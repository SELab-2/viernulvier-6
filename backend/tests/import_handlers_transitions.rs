#![allow(clippy::indexing_slicing)]
//! Integration tests for:
//!   POST /import/sessions/{id}/dry-run  (Task 6.5)
//!   POST /import/sessions/{id}/commit   (Task 6.7)
//!
//! Covered:
//! 1. dry_run_returns_404_for_missing_session
//! 2. dry_run_transitions_from_mapping_status
//! 3. dry_run_rejects_uploaded_session
//! 4. dry_run_allowed_from_dry_run_ready_status
//! 5. commit_returns_404_for_missing_session
//! 6. commit_transitions_from_dry_run_ready_status
//! 7. commit_rejects_mapping_session

mod common;

use axum::{body::Body, http::StatusCode};
use database::{
    Database,
    models::{import_session::ImportSessionStatus, user::UserRole},
    repos::import::CreateSession,
};
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::PgPool;
use std::str::FromStr;
use uuid::Uuid;

use crate::common::{router::TestRouter, user::create_test_user};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn body_json(resp: axum::response::Response<Body>) -> Value {
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).expect("response body was not valid JSON")
}

/// Seed an import session (entity_type = "production") and return its UUID.
async fn seed_session(pool: &PgPool, created_by: Uuid) -> Uuid {
    Database::new(pool.clone())
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "test.csv".to_string(),
            original_headers: vec!["Titel".to_string(), "Beschrijving".to_string()],
            created_by,
        })
        .await
        .unwrap()
}

/// Advance a session to the given status using the repo directly.
async fn set_status(pool: &PgPool, session_id: Uuid, status: ImportSessionStatus) {
    Database::new(pool.clone())
        .imports()
        .update_status(session_id, status, None)
        .await
        .unwrap();
}

// ─── Dry-run tests ────────────────────────────────────────────────────────────

/// 1. Random UUID → 404.
#[sqlx::test]
async fn dry_run_returns_404_for_missing_session(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r
        .post(
            &format!("/import/sessions/{missing_id}/dry-run"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 2. Session in `mapping` status → 202, body status transitions to `dry_run_pending`.
#[sqlx::test]
async fn dry_run_transitions_from_mapping_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_dr2@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    // Session starts as `uploaded`; advance to `mapping`.
    set_status(&pool, session_id, ImportSessionStatus::Mapping).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/dry-run"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::ACCEPTED);

    let json = body_json(resp).await;
    assert_eq!(json["status"], "dry_run_pending");
    assert_eq!(json["id"], session_id.to_string());
}

/// 3. Session in `uploaded` status → 400 (must be mapping or dry_run_ready first).
#[sqlx::test]
async fn dry_run_rejects_uploaded_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_dr3@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    // Session is in `uploaded` status by default — no status change needed.

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/dry-run"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 4. Session in `dry_run_ready` status → 202 (re-run is allowed).
#[sqlx::test]
async fn dry_run_allowed_from_dry_run_ready_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_dr4@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::DryRunReady).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/dry-run"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::ACCEPTED);

    let json = body_json(resp).await;
    assert_eq!(json["status"], "dry_run_pending");
}

// ─── Commit tests ─────────────────────────────────────────────────────────────

/// 5. Random UUID → 404.
#[sqlx::test]
async fn commit_returns_404_for_missing_session(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r
        .post(
            &format!("/import/sessions/{missing_id}/commit"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 6. Session in `dry_run_ready` status → 202, body status transitions to `committing`.
#[sqlx::test]
async fn commit_transitions_from_dry_run_ready_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_cm6@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::DryRunReady).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/commit"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::ACCEPTED);

    let json = body_json(resp).await;
    assert_eq!(json["status"], "committing");
    assert_eq!(json["id"], session_id.to_string());
}

/// 7. Session in `mapping` status → 400 (must be dry_run_ready first).
#[sqlx::test]
async fn commit_rejects_mapping_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_cm7@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Mapping).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/commit"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}
