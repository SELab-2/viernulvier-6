#![allow(clippy::indexing_slicing)]
//! Integration tests for PATCH /import/sessions/{id}/mapping (Task 6.4).
//!
//! Covered:
//! 1. update_mapping_unknown_field_returns_400
//! 2. update_mapping_happy_path_transitions_status
//! 3. update_mapping_returns_404_for_missing_session
//! 4. update_mapping_rejects_committed_session
//! 5. update_mapping_accepts_unmapped_columns (bonus)

mod common;

use axum::{body::Body, http::StatusCode};
use database::{
    Database,
    models::{import_session::ImportSessionStatus, user::UserRole},
    repos::import::CreateSession,
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
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

// ─── Tests ────────────────────────────────────────────────────────────────────

/// 1. Mapping with an unknown target field → 400.
#[sqlx::test]
async fn update_mapping_unknown_field_returns_400(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_map1@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    let r = TestRouter::as_editor(pool).await;
    let body = json!({
        "mapping": {
            "columns": {
                "Titel": "made_up_field"
            }
        }
    });
    let resp = r
        .patch(&format!("/import/sessions/{session_id}/mapping"), body)
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 2. Happy path: session in `uploaded` status, valid mapping → 200, status transitions to `mapping`.
#[sqlx::test]
async fn update_mapping_happy_path_transitions_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_map2@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    let r = TestRouter::as_editor(pool).await;
    let body = json!({
        "mapping": {
            "columns": {
                "Titel": "title_nl"
            }
        }
    });
    let resp = r
        .patch(&format!("/import/sessions/{session_id}/mapping"), body)
        .await;
    assert_eq!(resp.status(), StatusCode::OK);

    let json = body_json(resp).await;
    assert_eq!(json["status"], "mapping");
    assert_eq!(json["id"], session_id.to_string());
}

/// 3. Random UUID → 404.
#[sqlx::test]
async fn update_mapping_returns_404_for_missing_session(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let body = json!({
        "mapping": {
            "columns": {}
        }
    });
    let resp = r
        .patch(&format!("/import/sessions/{missing_id}/mapping"), body)
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 4. Session in `committed` status → 400 mentioning the non-editable status.
#[sqlx::test]
async fn update_mapping_rejects_committed_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_map4@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    // Advance status to `committed` directly via repo.
    db.imports()
        .update_status(session_id, ImportSessionStatus::Committed, None)
        .await
        .unwrap();

    let r = TestRouter::as_editor(pool).await;
    let body = json!({
        "mapping": {
            "columns": {
                "Titel": "title_nl"
            }
        }
    });
    let resp = r
        .patch(&format!("/import/sessions/{session_id}/mapping"), body)
        .await;
    // The response is 400; the handler encodes the status name in its PayloadError
    // which is logged server-side. The HTTP body carries a generic "Payload error" message
    // because AppError::PayloadError maps to a static response string.
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 5. (Bonus) Mapping with None values for some headers → 200, no validation error.
#[sqlx::test]
async fn update_mapping_accepts_unmapped_columns(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_map5@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    let r = TestRouter::as_editor(pool).await;
    let body = json!({
        "mapping": {
            "columns": {
                "Titel": "title_nl",
                "Beschrijving": null
            }
        }
    });
    let resp = r
        .patch(&format!("/import/sessions/{session_id}/mapping"), body)
        .await;
    assert_eq!(resp.status(), StatusCode::OK);

    let json = body_json(resp).await;
    assert_eq!(json["status"], "mapping");
}
