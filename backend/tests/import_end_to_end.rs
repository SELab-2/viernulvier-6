//! End-to-end integration test for the CSV import pipeline (Task 12.4).
//!
//! Drives the full import flow entirely through in-process calls:
//!   create session → save mapping (via HTTP PATCH) → dry-run (HTTP POST → worker)
//!   → commit (HTTP POST → worker) → assert productions in DB
//!   → rollback (HTTP POST) → assert productions gone.
//!
//! S3 is not required: the session is seeded via the repo (bypassing the upload
//! handler which needs S3), and the worker functions are called directly rather
//! than relying on the background worker loop.

mod common;

use axum::{body::Body, http::StatusCode};
use database::{
    Database,
    models::{import_row::ImportRowStatus, import_session::ImportSessionStatus, user::UserRole},
    repos::import::CreateSession,
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sqlx::PgPool;
use viernulvier_archive::import::{
    default_registry,
    worker::{WorkerContext, process_commit, process_dry_run_bytes},
};

use crate::common::{router::TestRouter, user::create_test_user};

// ─── Fixture ─────────────────────────────────────────────────────────────────

/// The exact content of `tests/fixtures/import/legacy_productions.csv`.
/// Loaded at compile time so the test is self-contained.
const LEGACY_PRODUCTIONS_CSV: &[u8] = include_bytes!("fixtures/import/legacy_productions.csv");

/// Titles that the CSV contains — used for DB assertions.
const EXPECTED_TITLES: &[&str] = &[
    "Hamlet",
    "Zwanenmeer",
    "De Nachtwacht",
    "Warme Winter",
    "After Hours",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn make_worker_ctx(db: Database) -> WorkerContext {
    WorkerContext {
        db,
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    }
}

async fn body_json(resp: axum::response::Response<Body>) -> Value {
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).expect("response body was not valid JSON")
}

// ─── Test ─────────────────────────────────────────────────────────────────────

/// Full import pipeline: seed → mapping → dry-run → commit → assert → rollback → assert gone.
#[sqlx::test(migrations = "./migrations")]
async fn import_end_to_end_productions(pool: PgPool) {
    let db = Database::new(pool.clone());
    let user = create_test_user(&db, "e2e_import@test.com", UserRole::Editor).await;

    // ── Step 1: Create the session via repo (bypasses S3-dependent upload handler) ──
    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "legacy_productions.csv".to_string(),
            original_headers: vec![
                "Titel".to_string(),
                "Ondertitel".to_string(),
                "Description1".to_string(),
                "Description2".to_string(),
                "Genre".to_string(),
                "ID".to_string(),
                "Planning ID".to_string(),
            ],
            created_by: user.id,
        })
        .await
        .expect("create_session failed");

    // ── Step 2: Save mapping via HTTP PATCH ────────────────────────────────────────
    let router = TestRouter::as_editor(pool.clone()).await;

    let mapping_body = json!({
        "mapping": {
            "columns": {
                "Titel":        "title_nl",
                "Ondertitel":   "supertitle_nl",
                "Description1": "description_nl",
                "Description2": "description_en",
                "Genre":        "uitdatabank_theme",
                "ID":           "source_id",
                "Planning ID":  null
            }
        }
    });
    let resp = router
        .patch(
            &format!("/import/sessions/{session_id}/mapping"),
            mapping_body,
        )
        .await;
    assert_eq!(
        resp.status(),
        StatusCode::OK,
        "PATCH mapping should return 200"
    );
    let json = body_json(resp).await;
    assert_eq!(
        json["status"], "mapping",
        "session should be in mapping status after PATCH"
    );

    // ── Step 3: Trigger dry-run via HTTP POST ─────────────────────────────────────
    let resp = router
        .post(
            &format!("/import/sessions/{session_id}/dry-run"),
            Value::Null,
        )
        .await;
    assert_eq!(
        resp.status(),
        StatusCode::ACCEPTED,
        "POST dry-run should return 202"
    );
    let json = body_json(resp).await;
    assert_eq!(
        json["status"], "dry_run_pending",
        "session should be dry_run_pending after POST"
    );

    // ── Step 4: Drive the dry-run worker directly ──────────────────────────────────
    let ctx = make_worker_ctx(db.clone());
    process_dry_run_bytes(session_id, LEGACY_PRODUCTIONS_CSV, &ctx)
        .await
        .expect("process_dry_run_bytes failed");

    // ── Step 5: Assert session is dry_run_ready and all 5 rows are will_create ──────
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .expect("get_session failed after dry-run")
        .expect("session missing after dry-run");
    assert_eq!(
        session.status,
        ImportSessionStatus::DryRunReady,
        "session should be dry_run_ready"
    );

    let rows = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows failed after dry-run");
    assert_eq!(rows.len(), 5, "expected 5 rows after dry-run");

    for row in &rows {
        assert_eq!(
            row.status,
            ImportRowStatus::WillCreate,
            "row {} should be will_create, got {:?}",
            row.row_number,
            row.status
        );
    }

    // ── Step 6: Trigger commit via HTTP POST ──────────────────────────────────────
    let resp = router
        .post(
            &format!("/import/sessions/{session_id}/commit"),
            Value::Null,
        )
        .await;
    assert_eq!(
        resp.status(),
        StatusCode::ACCEPTED,
        "POST commit should return 202"
    );
    let json = body_json(resp).await;
    assert_eq!(
        json["status"], "committing",
        "session should be committing after POST"
    );

    // ── Step 7: Drive the commit worker directly ──────────────────────────────────
    process_commit(session_id, &ctx)
        .await
        .expect("process_commit failed");

    // ── Step 8: Assert session is committed and rows are created ──────────────────
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .expect("get_session failed after commit")
        .expect("session missing after commit");
    assert_eq!(
        session.status,
        ImportSessionStatus::Committed,
        "session should be committed"
    );
    assert!(session.committed_at.is_some(), "committed_at should be set");

    let rows = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows failed after commit");
    assert_eq!(rows.len(), 5, "expected 5 rows after commit");
    for row in &rows {
        assert_eq!(
            row.status,
            ImportRowStatus::Created,
            "row {} should be created, got {:?}",
            row.row_number,
            row.status
        );
    }

    // ── Step 9: Assert all 5 expected titles exist in the productions table ────────
    for expected_title in EXPECTED_TITLES {
        let found = rows.iter().any(|row| {
            row.target_entity_id.is_some()
                && row.raw_data.0.get("Titel").and_then(|v| v.as_deref()) == Some(expected_title)
        });
        assert!(
            found,
            "expected a committed row for title '{expected_title}'"
        );
    }

    // Verify via DB repo that the productions have the correct NL titles.
    let production_count = db
        .productions()
        .count()
        .await
        .expect("productions count() failed");
    assert_eq!(production_count, 5, "expected 5 productions in DB");

    for row in &rows {
        let entity_id = row
            .target_entity_id
            .unwrap_or_else(|| panic!("row {} missing target_entity_id", row.row_number));
        let production = db
            .productions()
            .by_id(entity_id)
            .await
            .unwrap_or_else(|e| panic!("by_id failed for row {}: {e}", row.row_number));
        let nl = production
            .translations
            .iter()
            .find(|t| t.language_code == "nl")
            .unwrap_or_else(|| panic!("NL translation missing for row {}", row.row_number));

        let expected_title = row
            .raw_data
            .0
            .get("Titel")
            .and_then(|v| v.as_deref())
            .unwrap_or_else(|| panic!("row {} missing Titel in raw_data", row.row_number));

        assert_eq!(
            nl.title.as_deref(),
            Some(expected_title),
            "row {} NL title mismatch",
            row.row_number
        );
    }

    // ── Step 10: Rollback via HTTP POST ───────────────────────────────────────────
    let resp = router
        .post(
            &format!("/import/sessions/{session_id}/rollback"),
            Value::Null,
        )
        .await;
    assert_eq!(
        resp.status(),
        StatusCode::OK,
        "POST rollback should return 200"
    );
    let json = body_json(resp).await;
    assert_eq!(
        json["status"], "cancelled",
        "session should be cancelled after rollback"
    );

    // ── Step 11: Assert all 5 productions are gone from the DB ────────────────────
    let production_count_after = db
        .productions()
        .count()
        .await
        .expect("productions count() failed after rollback");
    assert_eq!(
        production_count_after, 0,
        "all productions should be deleted after rollback"
    );
}
