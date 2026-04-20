#![allow(clippy::indexing_slicing)]
//! Integration tests for the read-only import session endpoints (Task 6.3).
//!
//! Covered:
//! 1. list_sessions_empty_returns_empty_array
//! 2. list_sessions_returns_seeded_session
//! 3. get_session_returns_404_for_missing
//! 4. get_rows_returns_empty_for_session_with_no_rows
//! 5. get_rows_filters_by_status (bonus)

mod common;

use axum::{body::Body, http::StatusCode};
use database::{Database, models::user::UserRole, repos::import::CreateSession};
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

/// Seed an import session via the repo.  Returns the new session UUID.
async fn seed_session(pool: &PgPool, created_by: Uuid) -> Uuid {
    Database::new(pool.clone())
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "test.csv".to_string(),
            original_headers: vec!["Titel".to_string()],
            created_by,
        })
        .await
        .unwrap()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// 1. Empty DB → GET /import/sessions returns 200 with an empty array.
#[sqlx::test]
async fn list_sessions_empty_returns_empty_array(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let resp = r.get("/import/sessions").await;
    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert_eq!(json, Value::Array(vec![]));
}

/// 2. After seeding one session, GET /import/sessions returns an array of length 1
///    and the session id matches.
#[sqlx::test]
async fn list_sessions_returns_seeded_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor2@test.com", UserRole::Editor).await;

    let session_id = seed_session(&pool, user.id).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r.get("/import/sessions").await;
    assert_eq!(resp.status(), StatusCode::OK);

    let json = body_json(resp).await;
    let arr = json.as_array().expect("expected JSON array");
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["id"], session_id.to_string());
}

/// 3. GET /import/sessions/{random-uuid} → 404.
#[sqlx::test]
async fn get_session_returns_404_for_missing(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r.get(&format!("/import/sessions/{missing_id}")).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 4. Session with no rows → GET /import/sessions/{id}/rows returns 200 `[]`.
#[sqlx::test]
async fn get_rows_returns_empty_for_session_with_no_rows(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor3@test.com", UserRole::Editor).await;

    let session_id = seed_session(&pool, user.id).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r.get(&format!("/import/sessions/{session_id}/rows")).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert_eq!(json, Value::Array(vec![]));
}

/// 5. (Bonus) After seeding 2 rows with different statuses, ?status=pending
///    returns only the pending row.
#[sqlx::test]
async fn get_rows_filters_by_status(pool: PgPool) {
    use database::repos::import::NewImportRow;
    use sqlx::types::Json;
    use std::collections::BTreeMap;

    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor4@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    // Insert two rows, both start as `pending`.
    db.imports()
        .insert_rows(
            session_id,
            &[
                NewImportRow {
                    row_number: 1,
                    raw_data: Json(BTreeMap::new()),
                },
                NewImportRow {
                    row_number: 2,
                    raw_data: Json(BTreeMap::new()),
                },
            ],
        )
        .await
        .unwrap();

    // Fetch all rows to get their ids.
    let all_rows = db
        .imports()
        .get_rows(session_id, 10, 0, None)
        .await
        .unwrap();
    assert_eq!(all_rows.len(), 2);

    // Mark row 2 as will_skip so we have two distinct statuses.
    db.imports().mark_row_skipped(all_rows[1].id).await.unwrap();

    let r = TestRouter::as_editor(pool).await;

    // ?status=pending should return only 1 row.
    let resp = r
        .get(&format!(
            "/import/sessions/{session_id}/rows?status=pending"
        ))
        .await;
    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    let arr = json.as_array().expect("expected JSON array");
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["status"], "pending");
}

/// GET /import/entity-types returns a sorted list of registered adapters.
#[sqlx::test]
async fn list_entity_types_returns_registered_adapters(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let resp = r.get("/import/entity-types").await;
    assert_eq!(resp.status(), StatusCode::OK);

    let json = body_json(resp).await;
    let arr = json.as_array().expect("expected JSON array");
    let names: Vec<&str> = arr.iter().map(|v| v.as_str().unwrap()).collect();
    assert!(names.contains(&"production"), "missing production");
    assert!(names.contains(&"event"), "missing event");
}

/// GET /import/fields/production returns the adapter field spec.
#[sqlx::test]
async fn list_fields_returns_production_spec(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let resp = r.get("/import/fields/production").await;
    assert_eq!(resp.status(), StatusCode::OK);

    let json = body_json(resp).await;
    let arr = json.as_array().expect("expected JSON array");
    let names: Vec<&str> = arr.iter().map(|f| f["name"].as_str().unwrap()).collect();
    assert!(names.contains(&"title_nl"), "missing title_nl");
    assert!(names.contains(&"source_id"), "missing source_id");
}

/// GET /import/fields/<unknown> returns 404.
#[sqlx::test]
async fn list_fields_returns_404_for_unknown_entity_type(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let resp = r.get("/import/fields/not-a-real-entity").await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}
