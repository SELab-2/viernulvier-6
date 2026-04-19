//! Integration tests for ImportRepo.
//! Each test uses #[sqlx::test] which provisions a clean database with all migrations applied.

use std::collections::BTreeMap;

use database::{
    models::{
        import_row::{DiffEntry, ImportRowStatus, ImportWarning},
        import_session::{ImportMapping, ImportSessionStatus},
    },
    repos::import::{CreateSession, ImportRepo, NewImportRow},
};
use sqlx::{types::Json, PgPool};
use uuid::Uuid;

// ─── helpers ────────────────────────────────────────────────────────────────

/// Insert a minimal user and return its id.
async fn seed_user(pool: &PgPool) -> Uuid {
    sqlx::query_scalar!(
        r#"INSERT INTO users (username, email, password_hash, role)
           VALUES ('testuser', 'test@example.com', 'hash', 'user')
           RETURNING id"#,
    )
    .fetch_one(pool)
    .await
    .expect("failed to seed user")
}

fn make_repo(pool: &PgPool) -> ImportRepo<'_> {
    ImportRepo::new(pool)
}

fn session_input(user_id: Uuid) -> CreateSession {
    CreateSession {
        entity_type: "production".to_string(),
        filename: "test.csv".to_string(),
        original_headers: vec!["title".to_string(), "year".to_string()],
        created_by: user_id,
    }
}

// ─── tests ──────────────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn create_session_inserts_with_uploaded_status(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session failed");

    let status = sqlx::query_scalar!(
        r#"SELECT status FROM import_sessions WHERE id = $1"#,
        id
    )
    .fetch_one(&pool)
    .await
    .expect("session not found");

    assert_eq!(status, "uploaded");
}

#[sqlx::test(migrations = "../migrations")]
async fn get_session_returns_some_for_existing(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session failed");

    let session = repo
        .get_session(id)
        .await
        .expect("get_session error")
        .expect("expected Some");

    assert_eq!(session.id, id);
    assert_eq!(session.entity_type, "production");
}

#[sqlx::test(migrations = "../migrations")]
async fn get_session_returns_none_for_unknown_id(pool: PgPool) {
    let repo = make_repo(&pool);
    let result = repo
        .get_session(Uuid::new_v4())
        .await
        .expect("get_session error");
    assert!(result.is_none());
}

#[sqlx::test(migrations = "../migrations")]
async fn list_sessions_returns_rows_ordered_by_created_at_desc(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let id1 = repo
        .create_session(session_input(user_id))
        .await
        .expect("create 1");
    let id2 = repo
        .create_session(CreateSession {
            filename: "second.csv".to_string(),
            ..session_input(user_id)
        })
        .await
        .expect("create 2");

    let sessions = repo
        .list_sessions(10, 0)
        .await
        .expect("list_sessions failed");

    assert_eq!(sessions.len(), 2);
    // most recent first — id2 was inserted after id1 (UUIDv7 ordering)
    assert_eq!(sessions[0].id, id2);
    assert_eq!(sessions[1].id, id1);
}

#[sqlx::test(migrations = "../migrations")]
async fn save_mapping_persists_and_sets_status_mapping(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session");

    let mut columns = BTreeMap::new();
    columns.insert("title".to_string(), Some("name".to_string()));
    columns.insert("year".to_string(), None);

    repo.save_mapping(id, ImportMapping { columns })
        .await
        .expect("save_mapping failed");

    let status = sqlx::query_scalar!(
        r#"SELECT status FROM import_sessions WHERE id = $1"#,
        id
    )
    .fetch_one(&pool)
    .await
    .expect("session not found");

    let mapping_raw = sqlx::query_scalar!(
        r#"SELECT mapping FROM import_sessions WHERE id = $1"#,
        id
    )
    .fetch_one(&pool)
    .await
    .expect("session not found");

    assert_eq!(status, "mapping");
    let mapping: serde_json::Value = mapping_raw;
    assert!(mapping["columns"]["title"].as_str() == Some("name"));
}

#[sqlx::test(migrations = "../migrations")]
async fn update_status_updates_status_and_error(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session");

    repo.update_status(id, ImportSessionStatus::Failed, Some("something broke".to_string()))
        .await
        .expect("update_status failed");

    let (status, error): (String, Option<String>) = sqlx::query_as(
        "SELECT status, error FROM import_sessions WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("session not found");

    assert_eq!(status, "failed");
    assert_eq!(error.as_deref(), Some("something broke"));
}

#[sqlx::test(migrations = "../migrations")]
async fn insert_rows_bulk_inserts_and_sets_row_count(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session");

    let rows = vec![
        NewImportRow {
            row_number: 1,
            raw_data: Json(BTreeMap::from([
                ("title".to_string(), Some("Show A".to_string())),
            ])),
        },
        NewImportRow {
            row_number: 2,
            raw_data: Json(BTreeMap::from([
                ("title".to_string(), Some("Show B".to_string())),
            ])),
        },
    ];

    repo.insert_rows(session_id, &rows)
        .await
        .expect("insert_rows failed");

    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM import_rows WHERE session_id = $1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("count query failed");

    let row_count = sqlx::query_scalar!(
        r#"SELECT row_count FROM import_sessions WHERE id = $1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("session not found");

    assert_eq!(count, Some(2));
    assert_eq!(row_count, 2);
}

#[sqlx::test(migrations = "../migrations")]
async fn get_rows_returns_ordered_by_row_number(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session");

    let rows = vec![
        NewImportRow {
            row_number: 2,
            raw_data: Json(BTreeMap::new()),
        },
        NewImportRow {
            row_number: 1,
            raw_data: Json(BTreeMap::new()),
        },
    ];
    repo.insert_rows(session_id, &rows)
        .await
        .expect("insert_rows");

    let fetched = repo
        .get_rows(session_id, 10, 0, None)
        .await
        .expect("get_rows failed");

    assert_eq!(fetched.len(), 2);
    assert_eq!(fetched[0].row_number, 1);
    assert_eq!(fetched[1].row_number, 2);
}

#[sqlx::test(migrations = "../migrations")]
async fn get_rows_filters_by_status(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo
        .create_session(session_input(user_id))
        .await
        .expect("create_session");

    let rows = vec![
        NewImportRow { row_number: 1, raw_data: Json(BTreeMap::new()) },
        NewImportRow { row_number: 2, raw_data: Json(BTreeMap::new()) },
    ];
    repo.insert_rows(session_id, &rows).await.expect("insert_rows");

    // Mark row 1 as skipped
    let row1_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    repo.mark_row_skipped(row1_id).await.expect("mark_row_skipped");

    let pending = repo
        .get_rows(session_id, 10, 0, Some(ImportRowStatus::Pending))
        .await
        .expect("get_rows");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].row_number, 2);
}

#[sqlx::test(migrations = "../migrations")]
async fn update_row_overrides_persists(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let mut overrides = BTreeMap::new();
    overrides.insert("title".to_string(), serde_json::json!("Override Title"));

    repo.update_row_overrides(row_id, Json(overrides))
        .await
        .expect("update_row_overrides failed");

    let raw = sqlx::query_scalar!(
        r#"SELECT overrides FROM import_rows WHERE id = $1"#,
        row_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let val: serde_json::Value = raw;
    assert_eq!(val["title"].as_str(), Some("Override Title"));
}

#[sqlx::test(migrations = "../migrations")]
async fn update_row_resolved_refs_persists(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let ref_uuid = Uuid::new_v4();
    let mut refs = BTreeMap::new();
    refs.insert("location".to_string(), Some(ref_uuid));

    repo.update_row_resolved_refs(row_id, Json(refs))
        .await
        .expect("update_row_resolved_refs failed");

    let raw = sqlx::query_scalar!(
        r#"SELECT resolved_refs FROM import_rows WHERE id = $1"#,
        row_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let val: serde_json::Value = raw;
    assert_eq!(
        val["location"].as_str().unwrap(),
        ref_uuid.to_string()
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn mark_row_skipped_sets_will_skip(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    repo.mark_row_skipped(row_id).await.expect("mark_row_skipped");

    let status = sqlx::query_scalar!(
        r#"SELECT status FROM import_rows WHERE id = $1"#,
        row_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    assert_eq!(status, "will_skip");
}

#[sqlx::test(migrations = "../migrations")]
async fn save_dry_run_result_persists_all_fields(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let mut diff = BTreeMap::new();
    diff.insert(
        "title".to_string(),
        DiffEntry {
            current: Some(serde_json::json!("old")),
            incoming: Some(serde_json::json!("new")),
        },
    );

    let warnings = vec![ImportWarning {
        field: Some("year".to_string()),
        code: "PARSE_ERROR".to_string(),
        message: "could not parse year".to_string(),
    }];

    repo.save_dry_run_result(
        row_id,
        ImportRowStatus::WillUpdate,
        Some(Json(diff)),
        Json(warnings),
    )
    .await
    .expect("save_dry_run_result failed");

    let (status, diff_raw, warnings_raw): (String, Option<serde_json::Value>, serde_json::Value) =
        sqlx::query_as(
            "SELECT status, diff, warnings FROM import_rows WHERE id = $1",
        )
        .bind(row_id)
        .fetch_one(&pool)
        .await
        .expect("row not found");

    assert_eq!(status, "will_update");
    let diff_val = diff_raw.expect("diff should not be null");
    assert_eq!(diff_val["title"]["incoming"].as_str(), Some("new"));
    assert_eq!(warnings_raw[0]["code"].as_str(), Some("PARSE_ERROR"));
}

#[sqlx::test(migrations = "../migrations")]
async fn set_file_key_upserts_into_import_session_files(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");

    repo.set_file_key(session_id, "imports/test.csv".to_string())
        .await
        .expect("set_file_key failed");

    let s3_key = sqlx::query_scalar!(
        r#"SELECT s3_key FROM import_session_files WHERE session_id = $1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("file record not found");

    assert_eq!(s3_key, "imports/test.csv");

    // upsert — update the key
    repo.set_file_key(session_id, "imports/test-v2.csv".to_string())
        .await
        .expect("second set_file_key failed");

    let updated_key = sqlx::query_scalar!(
        r#"SELECT s3_key FROM import_session_files WHERE session_id = $1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("file record not found after upsert");

    assert_eq!(updated_key, "imports/test-v2.csv");
}

#[sqlx::test(migrations = "../migrations")]
async fn record_committed_row_sets_created_and_target_entity_id(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    let entity_id = Uuid::new_v4();

    repo.record_committed_row(row_id, ImportRowStatus::Created, entity_id)
        .await
        .expect("record_committed_row failed");

    let (status, target_id): (String, Option<Uuid>) = sqlx::query_as(
        "SELECT status, target_entity_id FROM import_rows WHERE id = $1",
    )
    .bind(row_id)
    .fetch_one(&pool)
    .await
    .expect("row not found");

    assert_eq!(status, "created");
    assert_eq!(target_id, Some(entity_id));
}

#[sqlx::test(migrations = "../migrations")]
async fn record_reverted_row_sets_reverted(pool: PgPool) {
    let user_id = seed_user(&pool).await;
    let repo = make_repo(&pool);

    let session_id = repo.create_session(session_input(user_id)).await.expect("create");
    repo.insert_rows(session_id, &[NewImportRow {
        row_number: 1,
        raw_data: Json(BTreeMap::new()),
    }])
    .await
    .expect("insert_rows");

    let row_id = sqlx::query_scalar!(
        r#"SELECT id FROM import_rows WHERE session_id = $1 AND row_number = 1"#,
        session_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    repo.record_reverted_row(row_id)
        .await
        .expect("record_reverted_row failed");

    let status = sqlx::query_scalar!(
        r#"SELECT status FROM import_rows WHERE id = $1"#,
        row_id
    )
    .fetch_one(&pool)
    .await
    .expect("row not found");

    assert_eq!(status, "reverted");
}
