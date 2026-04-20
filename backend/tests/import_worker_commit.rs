//! Integration tests for the commit worker processor (Task 7.3).
//!
//! Covered:
//! 1. commit_writes_productions_from_legacy_csv — full pipeline: dry-run then
//!    commit; asserts productions in DB match CSV contents and rows are Created.
//! 2. commit_handles_pending_rows_without_dry_run — commit with rows that start
//!    in `pending` status (no prior dry-run); asserts all become Created.

mod common;

use std::collections::BTreeMap;

use database::{
    Database,
    models::{import_row::ImportRowStatus, import_session::ImportMapping, user::UserRole},
    repos::import::{CreateSession, NewImportRow},
};
use sqlx::{PgPool, types::Json};
use viernulvier_archive::import::{
    default_registry,
    worker::{WorkerContext, process_commit, process_dry_run_bytes},
};

use crate::common::user::create_test_user;

// ─── Fixture CSV ─────────────────────────────────────────────────────────────

const LEGACY_PRODUCTIONS_CSV: &str = "\
Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID\r\n\
Hamlet,Een tragedie,First description,Second description,Drama,42,100\r\n\
Macbeth,,A Scottish play,,Drama,43,101\r\n\
";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

fn make_worker_ctx(db: Database) -> WorkerContext {
    WorkerContext {
        db,
        registry: default_registry(),
        s3_client: None,
        s3_bucket: None,
    }
}

// ─── Test 1: full pipeline dry-run → commit ───────────────────────────────────

#[sqlx::test(migrations = "./migrations")]
async fn commit_writes_productions_from_legacy_csv(pool: PgPool) {
    let db = Database::new(pool);
    let user = create_test_user(&db, "commit_test1@test.com", UserRole::Editor).await;

    // 1. Create session with mapping.
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

    // 2. Run dry-run.
    db.imports()
        .update_status(
            session_id,
            database::models::import_session::ImportSessionStatus::DryRunPending,
            None,
        )
        .await
        .expect("update_status to dry_run_pending failed");

    let ctx = make_worker_ctx(db.clone());

    process_dry_run_bytes(session_id, LEGACY_PRODUCTIONS_CSV.as_bytes(), &ctx)
        .await
        .expect("process_dry_run_bytes failed");

    // 3. Confirm both rows are WillCreate after dry-run.
    let rows_after_dry_run = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows after dry-run failed");
    assert_eq!(rows_after_dry_run.len(), 2, "expected 2 rows after dry-run");
    for row in &rows_after_dry_run {
        assert_eq!(
            row.status,
            ImportRowStatus::WillCreate,
            "row {} should be will_create after dry-run",
            row.row_number
        );
    }

    // 4. Advance session to Committing.
    db.imports()
        .update_status(
            session_id,
            database::models::import_session::ImportSessionStatus::Committing,
            None,
        )
        .await
        .expect("update_status to committing failed");

    // 5. Run commit processor.
    process_commit(session_id, &ctx)
        .await
        .expect("process_commit failed");

    // 6. Assert session status == Committed and committed_at is set.
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .expect("get_session failed")
        .expect("session missing");
    assert_eq!(
        session.status,
        database::models::import_session::ImportSessionStatus::Committed,
        "session should be committed"
    );
    assert!(session.committed_at.is_some(), "committed_at should be set");

    // 7. Assert import_rows have status Created and target_entity_id set.
    //    Then fetch each production by target_entity_id and verify title matches CSV.
    let rows_after_commit = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows after commit failed");
    assert_eq!(rows_after_commit.len(), 2, "still expected 2 rows");

    // Expected titles by row_number (from the CSV fixture).
    let expected_titles = [(1, "Hamlet"), (2, "Macbeth")];

    for row in &rows_after_commit {
        assert_eq!(
            row.status,
            ImportRowStatus::Created,
            "row {} should be created, got {:?}",
            row.row_number,
            row.status
        );
        let entity_id = row
            .target_entity_id
            .unwrap_or_else(|| panic!("row {} should have target_entity_id set", row.row_number));

        // Fetch the created production and verify its NL title.
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

        if let Some((_rn, expected_title)) =
            expected_titles.iter().find(|(rn, _)| *rn == row.row_number)
        {
            assert_eq!(
                nl.title.as_deref(),
                Some(*expected_title),
                "row {} title mismatch",
                row.row_number
            );
        }
    }
}

// ─── Test 2: pending rows (no prior dry-run) ─────────────────────────────────

#[sqlx::test(migrations = "./migrations")]
async fn commit_handles_pending_rows_without_dry_run(pool: PgPool) {
    let db = Database::new(pool);
    let user = create_test_user(&db, "commit_test2@test.com", UserRole::Editor).await;

    // 1. Create session with mapping.
    let session_id = db
        .imports()
        .create_session(CreateSession {
            entity_type: "production".to_string(),
            filename: "Productions - pending.csv".to_string(),
            original_headers: vec!["Titel".to_string(), "ID".to_string()],
            created_by: user.id,
        })
        .await
        .expect("create_session failed");

    let mut mapping_columns = BTreeMap::new();
    mapping_columns.insert("Titel".to_string(), Some("title_nl".to_string()));
    mapping_columns.insert("ID".to_string(), Some("source_id".to_string()));
    db.imports()
        .save_mapping(
            session_id,
            ImportMapping {
                columns: mapping_columns,
            },
        )
        .await
        .expect("save_mapping failed");

    // 2. Insert rows directly in 'pending' status (no dry-run).
    let raw_row_1: BTreeMap<String, Option<String>> = {
        let mut m = BTreeMap::new();
        m.insert("Titel".to_string(), Some("Othello".to_string()));
        m.insert("ID".to_string(), Some("77".to_string()));
        m
    };
    let raw_row_2: BTreeMap<String, Option<String>> = {
        let mut m = BTreeMap::new();
        m.insert("Titel".to_string(), Some("King Lear".to_string()));
        m.insert("ID".to_string(), Some("78".to_string()));
        m
    };

    db.imports()
        .insert_rows(
            session_id,
            &[
                NewImportRow {
                    row_number: 1,
                    raw_data: Json(raw_row_1),
                },
                NewImportRow {
                    row_number: 2,
                    raw_data: Json(raw_row_2),
                },
            ],
        )
        .await
        .expect("insert_rows failed");

    // 3. Advance directly to Committing (skip dry-run).
    db.imports()
        .update_status(
            session_id,
            database::models::import_session::ImportSessionStatus::Committing,
            None,
        )
        .await
        .expect("update_status to committing failed");

    let ctx = make_worker_ctx(db.clone());

    // 4. Run commit.
    process_commit(session_id, &ctx)
        .await
        .expect("process_commit failed");

    // 5. Assert session is Committed.
    let session = db
        .imports()
        .get_session(session_id)
        .await
        .expect("get_session failed")
        .expect("session missing");
    assert_eq!(
        session.status,
        database::models::import_session::ImportSessionStatus::Committed,
        "session should be committed"
    );
    assert!(
        session.committed_at.is_some(),
        "committed_at should be set after commit"
    );

    // 6. Assert all rows are Created with target_entity_id set, and verify productions.
    let rows = db
        .imports()
        .get_rows(session_id, 100, 0, None)
        .await
        .expect("get_rows failed");
    assert_eq!(rows.len(), 2, "expected 2 rows");

    // Expected titles by row_number (from the raw_data seeded above).
    let expected_titles = [(1, "Othello"), (2, "King Lear")];

    for row in &rows {
        assert_eq!(
            row.status,
            ImportRowStatus::Created,
            "pending row {} should become created, got {:?}",
            row.row_number,
            row.status
        );
        let entity_id = row
            .target_entity_id
            .unwrap_or_else(|| panic!("row {} should have target_entity_id set", row.row_number));

        // Fetch the created production and verify its NL title.
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

        if let Some((_rn, expected_title)) =
            expected_titles.iter().find(|(rn, _)| *rn == row.row_number)
        {
            assert_eq!(
                nl.title.as_deref(),
                Some(*expected_title),
                "row {} title mismatch",
                row.row_number
            );
        }
    }
}
