//! Integration tests for PATCH /import/rows/{id} (Task 6.6).
//!
//! Covered:
//! 1. update_row_returns_404_for_missing_row
//! 2. update_row_skip_true_marks_will_skip
//! 3. update_row_applies_overrides_and_sets_will_create
//! 4. update_row_rejects_committed_session

mod common;

use axum::{body::Body, http::StatusCode};
use database::{
    Database,
    models::{
        import_row::ImportRowStatus,
        import_session::{ImportMapping, ImportSessionStatus},
        user::UserRole,
    },
    repos::import::{CreateSession, NewImportRow},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sqlx::{PgPool, types::Json};
use std::{collections::BTreeMap, str::FromStr};
use uuid::Uuid;

use crate::common::{router::TestRouter, user::create_test_user};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async fn body_json(resp: axum::response::Response<Body>) -> Value {
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).expect("response body was not valid JSON")
}

/// Seed a session with entity_type = "production" and return its id.
async fn seed_session(db: &Database, created_by: Uuid) -> Uuid {
    db.imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "test.csv".to_string(),
            original_headers: vec!["Titel".to_string()],
            created_by,
        })
        .await
        .unwrap()
}

/// Seed one row with raw_data `{"Titel": Some(value)}` and return its id.
async fn seed_row(db: &Database, session_id: Uuid, titel: &str) -> Uuid {
    let mut raw: BTreeMap<String, Option<String>> = BTreeMap::new();
    raw.insert("Titel".to_string(), Some(titel.to_string()));

    db.imports()
        .insert_rows(
            session_id,
            &[NewImportRow {
                row_number: 1,
                raw_data: Json(raw),
            }],
        )
        .await
        .unwrap();

    // Fetch it back
    let rows = db.imports().get_rows(session_id, 1, 0, None).await.unwrap();
    rows.into_iter().next().unwrap().id
}

/// Save a mapping `{"Titel" => "title_nl"}` on the session.
async fn save_title_mapping(db: &Database, session_id: Uuid) {
    let mut cols: BTreeMap<String, Option<String>> = BTreeMap::new();
    cols.insert("Titel".to_string(), Some("title_nl".to_string()));
    db.imports()
        .save_mapping(session_id, ImportMapping { columns: cols })
        .await
        .unwrap();
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

/// 1. Random row UUID → 404.
#[sqlx::test]
async fn update_row_returns_404_for_missing_row(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r.patch(&format!("/import/rows/{missing}"), json!({})).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 2. `skip: true` → 200, status = `will_skip`.
#[sqlx::test]
async fn update_row_skip_true_marks_will_skip(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ur2@test.com", UserRole::Editor).await;
    let session_id = seed_session(&db, user.id).await;
    let row_id = seed_row(&db, session_id, "Some Production").await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .patch(&format!("/import/rows/{row_id}"), json!({ "skip": true }))
        .await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body["status"], "will_skip");
    assert_eq!(body["id"], row_id.to_string());
}

/// 3. Apply overrides + mapping → 200, status = `will_create` (new title, no source_id to match).
#[sqlx::test]
async fn update_row_applies_overrides_and_sets_will_create(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ur3@test.com", UserRole::Editor).await;
    let session_id = seed_session(&db, user.id).await;

    // Save mapping: Titel -> title_nl (status transitions to "mapping")
    save_title_mapping(&db, session_id).await;

    // Seed a row with the mapped header
    let row_id = seed_row(&db, session_id, "Original Title").await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .patch(
            &format!("/import/rows/{row_id}"),
            json!({
                "overrides": {
                    "title_nl": "Updated Title"
                }
            }),
        )
        .await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;

    // The production adapter's lookup_existing checks source_id; no source_id → WillCreate.
    assert_eq!(body["status"], "will_create");
    assert_eq!(body["id"], row_id.to_string());

    // Overrides persisted on the row
    assert_eq!(body["overrides"]["title_nl"], "Updated Title");
}

/// 4. Session in `committed` status → 400.
#[sqlx::test]
async fn update_row_rejects_committed_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ur4@test.com", UserRole::Editor).await;
    let session_id = seed_session(&db, user.id).await;
    let row_id = seed_row(&db, session_id, "Some Title").await;

    // Advance session to committed
    db.imports()
        .update_status(session_id, ImportSessionStatus::Committed, None)
        .await
        .unwrap();

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .patch(
            &format!("/import/rows/{row_id}"),
            json!({ "overrides": { "title_nl": "x" } }),
        )
        .await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 5. `skip: false` on a will_skip row → re-validates and returns will_create.
#[sqlx::test]
async fn update_row_unskip_triggers_revalidation(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ur5@test.com", UserRole::Editor).await;
    let session_id = seed_session(&db, user.id).await;
    save_title_mapping(&db, session_id).await;
    let row_id = seed_row(&db, session_id, "A Great Show").await;

    // First mark as skipped
    db.imports().mark_row_skipped(row_id).await.unwrap();

    // Verify it is skipped
    let rows = db.imports().get_rows(session_id, 1, 0, None).await.unwrap();
    assert_eq!(rows[0].status, ImportRowStatus::WillSkip);

    // Now un-skip by patching with skip: false
    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .patch(&format!("/import/rows/{row_id}"), json!({ "skip": false }))
        .await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    // Re-validated: no source_id → will_create
    assert_eq!(body["status"], "will_create");
}
