//! Integration tests for the dry-run worker processor (Task 7.2).
//!
//! Covered:
//! 1. dry_run_processes_legacy_productions  — verifies per-row statuses after a
//!    dry-run on a 2-row legacy productions CSV.
//! 2. dry_run_is_idempotent                 — calling the processor twice must
//!    leave exactly 2 rows (not 4) with consistent statuses.

mod common;

use std::collections::BTreeMap;

use database::{
    Database,
    models::{import_row::ImportRowStatus, import_session::ImportMapping, user::UserRole},
    repos::import::CreateSession,
};
use sqlx::PgPool;
use viernulvier_archive::import::{
    default_registry,
    worker::{WorkerContext, process_dry_run_bytes},
};

use crate::common::user::create_test_user;

// ─── Fixture CSV ──────────────────────────────────────────────────────────────

const LEGACY_PRODUCTIONS_CSV: &str = "\
Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID\r\n\
Hamlet,Een tragedie,First description,Second description,Drama,42,100\r\n\
Macbeth,,A Scottish play,,Drama,43,101\r\n\
";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Build a mapping from the legacy CSV headers to ProductionImport target fields.
fn legacy_production_mapping() -> ImportMapping {
    let mut columns = BTreeMap::new();
    columns.insert("Titel".to_string(), Some("title_nl".to_string()));
    columns.insert("Ondertitel".to_string(), Some("supertitle_nl".to_string()));
    columns.insert(
        "Description1".to_string(),
        Some("description_nl".to_string()),
    );
    columns.insert(
        "Description2".to_string(),
        Some("description_en".to_string()),
    );
    columns.insert("Genre".to_string(), Some("uitdatabank_theme".to_string()));
    columns.insert("ID".to_string(), Some("source_id".to_string()));
    columns.insert("Planning ID".to_string(), None);
    ImportMapping { columns }
}

// ─── Test 1: rows are inserted and get WillCreate status ─────────────────────

#[sqlx::test(migrations = "./migrations")]
async fn dry_run_processes_legacy_productions(pool: PgPool) {
    let db = Database::new(pool);

    let user = create_test_user(&db, "dryrun_test1@test.com", UserRole::Editor).await;

    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "Productions - output.csv".to_string(),
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

    // Save the mapping (also flips status to 'mapping').
    db.imports()
        .save_mapping(session_id, legacy_production_mapping())
        .await
        .expect("save_mapping failed");

    // Advance to dry_run_pending as the handler would.
    db.imports()
        .update_status(
            session_id,
            database::models::import_session::ImportSessionStatus::DryRunPending,
            None,
        )
        .await
        .expect("update_status failed");

    let ctx = WorkerContext {
        db: db.clone(),
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    };

    process_dry_run_bytes(session_id, LEGACY_PRODUCTIONS_CSV.as_bytes(), &ctx)
        .await
        .expect("process_dry_run_bytes failed");

    // Session should now be DryRunReady.
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .unwrap()
        .expect("session missing");
    assert_eq!(
        session.status,
        database::models::import_session::ImportSessionStatus::DryRunReady,
        "session should be dry_run_ready"
    );

    // Fetch all rows.
    let rows = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows failed");

    assert_eq!(rows.len(), 2, "expected 2 rows");

    // No existing productions were seeded, so every row should be WillCreate.
    for row in &rows {
        assert_eq!(
            row.status,
            ImportRowStatus::WillCreate,
            "row {} should be will_create, got {:?}",
            row.row_number,
            row.status
        );
    }

    // Verify raw_data for row 1.
    let row1 = rows
        .iter()
        .find(|r| r.row_number == 1)
        .expect("row 1 missing");
    assert_eq!(
        row1.raw_data.0.get("Titel").and_then(|v| v.as_deref()),
        Some("Hamlet"),
        "row 1 Titel should be Hamlet"
    );

    // Verify raw_data for row 2.
    let row2 = rows
        .iter()
        .find(|r| r.row_number == 2)
        .expect("row 2 missing");
    assert_eq!(
        row2.raw_data.0.get("Titel").and_then(|v| v.as_deref()),
        Some("Macbeth"),
        "row 2 Titel should be Macbeth"
    );
}

// ─── Test 2: idempotency ──────────────────────────────────────────────────────

#[sqlx::test(migrations = "./migrations")]
async fn dry_run_is_idempotent(pool: PgPool) {
    let db = Database::new(pool);

    let user = create_test_user(&db, "dryrun_test2@test.com", UserRole::Editor).await;

    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "Productions - output.csv".to_string(),
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

    db.imports()
        .save_mapping(session_id, legacy_production_mapping())
        .await
        .expect("save_mapping failed");

    db.imports()
        .update_status(
            session_id,
            database::models::import_session::ImportSessionStatus::DryRunPending,
            None,
        )
        .await
        .expect("update_status failed");

    let ctx = WorkerContext {
        db: db.clone(),
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    };

    // First run.
    process_dry_run_bytes(session_id, LEGACY_PRODUCTIONS_CSV.as_bytes(), &ctx)
        .await
        .expect("first run failed");

    // Second run — must be safe to call again.
    process_dry_run_bytes(session_id, LEGACY_PRODUCTIONS_CSV.as_bytes(), &ctx)
        .await
        .expect("second run failed");

    // Still exactly 2 rows (not 4).
    let rows = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows failed");
    assert_eq!(rows.len(), 2, "expected exactly 2 rows after two runs");

    // Session row_count should be 2.
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .unwrap()
        .expect("session missing");
    assert_eq!(session.row_count, 2, "row_count should be 2");
    assert_eq!(
        session.status,
        database::models::import_session::ImportSessionStatus::DryRunReady,
        "session should be dry_run_ready after second run"
    );

    // All rows still WillCreate.
    for row in &rows {
        assert_eq!(
            row.status,
            ImportRowStatus::WillCreate,
            "row {} should still be will_create after re-run",
            row.row_number
        );
    }
}
