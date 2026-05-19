#![allow(clippy::indexing_slicing)]
//! Integration tests for Task 6.8:
//!   POST /import/sessions/{id}/rollback
//!   POST /import/rows/{id}/revert
//!   DELETE /import/sessions/{id}  (cancel)
//!
//! Covered:
//! 1. rollback_returns_404_for_missing_session
//! 2. rollback_rejects_mapping_session            (wrong status → 400)
//! 3. revert_row_returns_404_for_missing_row
//! 4. revert_row_rejects_pending_row              (status Pending → 400)
//! 5. cancel_session_returns_404_for_missing_session
//! 6. cancel_session_rejects_committed_session    (→ 400)
//! 7. cancel_session_returns_204_from_mapping_status (happy path)
//! 8. delete_session_returns_204_from_failed_status
//! 9. delete_session_rejects_cancelled_session

mod common;

use axum::{body::Body, http::StatusCode};
use db::{
    Database,
    models::{
        import_row::ImportRowStatus,
        import_session::{ImportMapping, ImportSessionStatus},
        user::UserRole,
    },
    repos::import::{CreateSession, NewImportRow},
};
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::{PgPool, types::Json};
use std::{collections::BTreeMap, str::FromStr};
use uuid::Uuid;
use api::import::{
    default_registry,
    worker::{WorkerContext, process_commit},
};

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
            original_headers: vec!["Titel".to_string()],
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

fn make_worker_ctx(db: Database) -> WorkerContext {
    WorkerContext {
        db,
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    }
}

// ─── Rollback tests ───────────────────────────────────────────────────────────

/// 1. Random UUID → 404.
#[sqlx::test]
async fn rollback_returns_404_for_missing_session(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r
        .post(
            &format!("/import/sessions/{missing_id}/rollback"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 2. Session in `mapping` status → 400 (not eligible for rollback).
#[sqlx::test]
async fn rollback_rejects_mapping_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_rb2@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Mapping).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/sessions/{session_id}/rollback"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);

    // Error body has shape {"message": "...", "success": false}
    let json = body_json(resp).await;
    assert_eq!(json["success"], false);
    // message is the static "Payload error" string; the dynamic detail is not exposed in the
    // response body — just assert status 400 is sufficient (already asserted above).
}

// ─── Revert-row tests ─────────────────────────────────────────────────────────

/// 3. Random UUID → 404.
#[sqlx::test]
async fn revert_row_returns_404_for_missing_row(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r
        .post(
            &format!("/import/rows/{missing_id}/revert"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 4. Row in `pending` status → 400 (not revertible).
#[sqlx::test]
async fn revert_row_rejects_pending_row(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_rr4@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;

    // Insert a row directly into import_rows with status 'pending'
    let row_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO import_rows (session_id, row_number, raw_data, status)
           VALUES ($1, 1, '{}', 'pending')
           RETURNING id"#,
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .post(
            &format!("/import/rows/{row_id}/revert"),
            serde_json::Value::Null,
        )
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── Cancel session tests ─────────────────────────────────────────────────────

/// 5. Random UUID → 404.
#[sqlx::test]
async fn cancel_session_returns_404_for_missing_session(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let missing_id = Uuid::from_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();
    let resp = r.delete(&format!("/import/sessions/{missing_id}")).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// 6. Session in `committed` status → 400 (use rollback instead).
#[sqlx::test]
async fn cancel_session_rejects_committed_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_cs6@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Committed).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r.delete(&format!("/import/sessions/{session_id}")).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);

    // Error body has shape {"message": "...", "success": false}
    let json = body_json(resp).await;
    assert_eq!(json["success"], false);
}

/// 7. Session in `mapping` status → 204 No Content (happy path cancel).
#[sqlx::test]
async fn cancel_session_returns_204_from_mapping_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_cs7@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Mapping).await;

    let r = TestRouter::as_editor(pool.clone()).await;
    let resp = r.delete(&format!("/import/sessions/{session_id}")).await;
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);

    // Verify the session is now cancelled in the DB
    let updated = Database::new(pool)
        .imports()
        .get_session(session_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(updated.status, ImportSessionStatus::Cancelled);
}

/// 8. Session in `failed` status → 204 No Content and row removed from DB.
#[sqlx::test]
async fn delete_session_returns_204_from_failed_status(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ds8@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Failed).await;

    let r = TestRouter::as_editor(pool.clone()).await;
    let resp = r
        .delete(&format!("/import/sessions/{session_id}/delete"))
        .await;
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);

    let deleted = Database::new(pool)
        .imports()
        .get_session(session_id)
        .await
        .unwrap();
    assert!(deleted.is_none(), "session should be removed");
}

/// 9. Session in `cancelled` status → 400 (history delete blocked).
#[sqlx::test]
async fn delete_session_rejects_cancelled_session(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ds9@test.com", UserRole::Editor).await;
    let session_id = seed_session(&pool, user.id).await;
    set_status(&pool, session_id, ImportSessionStatus::Cancelled).await;

    let r = TestRouter::as_editor(pool).await;
    let resp = r
        .delete(&format!("/import/sessions/{session_id}/delete"))
        .await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 10. Deleting a failed partially committed session reverts imported rows before removing history.
#[sqlx::test(migrations = "./migrations")]
async fn delete_session_reverts_partial_import_before_removing_history(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "editor_ds10@test.com", UserRole::Editor).await;

    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "partial.csv".to_string(),
            original_headers: vec!["Titel".to_string(), "ID".to_string()],
            created_by: user.id,
        })
        .await
        .unwrap();

    db.imports()
        .save_mapping(
            session_id,
            ImportMapping {
                columns: BTreeMap::from([
                    ("Titel".to_string(), Some("title_nl".to_string())),
                    ("ID".to_string(), Some("source_id".to_string())),
                ]),
            },
        )
        .await
        .unwrap();

    db.imports()
        .insert_rows(
            session_id,
            &[
                NewImportRow {
                    row_number: 1,
                    raw_data: Json(BTreeMap::from([
                        ("Titel".to_string(), Some("Valid Row".to_string())),
                        ("ID".to_string(), Some("701".to_string())),
                    ])),
                },
                NewImportRow {
                    row_number: 2,
                    raw_data: Json(BTreeMap::from([
                        ("Titel".to_string(), None),
                        ("ID".to_string(), Some("702".to_string())),
                    ])),
                },
            ],
        )
        .await
        .unwrap();

    let rows = db
        .imports()
        .get_rows(session_id, 10, 0, None)
        .await
        .unwrap();
    db.imports()
        .save_dry_run_result(rows[0].id, ImportRowStatus::WillCreate, None, Json(vec![]))
        .await
        .unwrap();
    db.imports()
        .save_dry_run_result(rows[1].id, ImportRowStatus::WillUpdate, None, Json(vec![]))
        .await
        .unwrap();
    sqlx::query!(
        r#"UPDATE import_rows SET target_entity_id = $2 WHERE id = $1"#,
        rows[1].id,
        Uuid::now_v7(),
    )
    .execute(db.pool())
    .await
    .unwrap();

    db.imports()
        .update_status(session_id, ImportSessionStatus::Committing, None)
        .await
        .unwrap();
    let ctx = make_worker_ctx(db.clone());
    process_commit(session_id, &ctx).await.unwrap();

    let failed_session = db.imports().get_session(session_id).await.unwrap().unwrap();
    assert_eq!(failed_session.status, ImportSessionStatus::Failed);
    assert!(failed_session.committed_at.is_some());

    let imported_rows = db
        .imports()
        .get_rows(session_id, 10, 0, None)
        .await
        .unwrap();
    let created_row = imported_rows
        .iter()
        .find(|row| row.status == ImportRowStatus::Created)
        .unwrap();
    let created_production_id = created_row.target_entity_id.unwrap();
    assert!(db.productions().by_id(created_production_id).await.is_ok());

    let r = TestRouter::as_editor(pool.clone()).await;
    let resp = r
        .delete(&format!("/import/sessions/{session_id}/delete"))
        .await;
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);

    let deleted = Database::new(pool.clone())
        .imports()
        .get_session(session_id)
        .await
        .unwrap();
    assert!(deleted.is_none());
    assert!(
        Database::new(pool)
            .productions()
            .by_id(created_production_id)
            .await
            .is_err(),
        "created production should be reverted before deleting history"
    );
}
