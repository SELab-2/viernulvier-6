use axum::http::StatusCode;
use database::{
    Database,
    models::{import_error::ImportErrorCreate, user::UserRole},
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[derive(Deserialize)]
struct EditorResponse {
    email: String,
    role: UserRole,
}

#[derive(Debug, Deserialize)]
struct ImportErrorResponse {
    severity: String,
    entity: String,
    source_id: Option<i32>,
    error_kind: String,
    resolved_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
struct PaginatedImportErrorsResponse {
    data: Vec<ImportErrorResponse>,
    next_cursor: Option<String>,
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_admin_access(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.get("/editor/me").await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_admin(db).await;
    let response = app.get("/editor/me").await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "admin@test.com");
    assert_eq!(data.role, UserRole::Admin);
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_editor_access(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.get("/editor/me").await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app.get("/editor/me").await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "editor@test.com");
    assert_eq!(data.role, UserRole::Editor);
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_user_denied(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.get("/editor/me").await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_user(db).await;
    let response = app.get("/editor/me").await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
#[test_log::test]
async fn create_editor_admin_success(db: PgPool) {
    let payload = serde_json::json!({
        "username": "neweditor",
        "email": "neweditor@test.com",
        "password": "password123"
    });

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/editor/create", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_admin(db).await;

    let response = app.post("/editor/create", &payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "neweditor@test.com");
    assert_eq!(data.role, UserRole::Editor);
}

#[sqlx::test]
#[test_log::test]
async fn create_editor_editor_denied(db: PgPool) {
    let payload = serde_json::json!({
        "username": "anothereditor",
        "email": "anothereditor@test.com",
        "password": "password123"
    });

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/editor/create", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/editor/create", &payload).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
#[test_log::test]
async fn import_errors_editor_access(db: PgPool) {
    let database = Database::new(db.clone());
    database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "warning".into(),
            entity: "space".into(),
            source_id: Some(404),
            error_kind: "missing_relation".into(),
            field: None,
            relation: Some("location".into()),
            relation_source_id: Some(999),
            message: "space references missing location".into(),
            payload: None,
        })
        .await
        .unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.get("/import-errors").await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app.get("/import-errors").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedImportErrorsResponse = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(data.next_cursor, None);
    let error = data.data.first().expect("expected one import error");
    assert_eq!(error.severity, "warning");
    assert_eq!(error.entity, "space");
    assert_eq!(error.source_id, Some(404));
    assert_eq!(error.error_kind, "missing_relation");
    assert_eq!(error.resolved_at, None);
}

#[sqlx::test]
#[test_log::test]
async fn import_errors_resolved_filter(db: PgPool) {
    let database = Database::new(db.clone());

    database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "warning".into(),
            entity: "event".into(),
            source_id: Some(1),
            error_kind: "missing_relation".into(),
            field: None,
            relation: Some("hall".into()),
            relation_source_id: Some(2),
            message: "event imported without hall".into(),
            payload: None,
        })
        .await
        .unwrap();

    database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "error".into(),
            entity: "space".into(),
            source_id: Some(2),
            error_kind: "missing_relation".into(),
            field: None,
            relation: Some("location".into()),
            relation_source_id: Some(3),
            message: "space references missing location".into(),
            payload: None,
        })
        .await
        .unwrap();

    database
        .import_errors()
        .resolve_for_item("space", Some(2))
        .await
        .unwrap();

    let app = TestRouter::as_editor(db).await;

    let unresolved: PaginatedImportErrorsResponse =
        app.get("/import-errors").await.into_struct().await;
    assert_eq!(unresolved.data.len(), 1);
    let unresolved_error = unresolved
        .data
        .first()
        .expect("expected one unresolved import error");
    assert_eq!(unresolved_error.entity, "event");
    assert_eq!(unresolved_error.resolved_at, None);

    let resolved: PaginatedImportErrorsResponse = app
        .get("/import-errors?resolved=true")
        .await
        .into_struct()
        .await;
    assert_eq!(resolved.data.len(), 1);
    let resolved_error = resolved
        .data
        .first()
        .expect("expected one resolved import error");
    assert_eq!(resolved_error.entity, "space");
    assert!(resolved_error.resolved_at.is_some());
}

#[sqlx::test]
#[test_log::test]
async fn import_errors_paginates(db: PgPool) {
    let database = Database::new(db.clone());

    for source_id in [101, 102, 103] {
        database
            .import_errors()
            .record(ImportErrorCreate {
                run_id: Some(Uuid::now_v7()),
                severity: "warning".into(),
                entity: "event".into(),
                source_id: Some(source_id),
                error_kind: "missing_relation".into(),
                field: None,
                relation: Some("production".into()),
                relation_source_id: Some(source_id + 1000),
                message: format!(
                    "event references missing production source_id {}",
                    source_id + 1000
                ),
                payload: None,
            })
            .await
            .unwrap();
    }

    let app = TestRouter::as_editor(db).await;

    let first_page: PaginatedImportErrorsResponse =
        app.get("/import-errors?limit=2").await.into_struct().await;
    assert_eq!(first_page.data.len(), 2);
    assert!(first_page.next_cursor.is_some());

    let second_page: PaginatedImportErrorsResponse = app
        .get(&format!(
            "/import-errors?limit=2&cursor={}",
            first_page.next_cursor.clone().unwrap()
        ))
        .await
        .into_struct()
        .await;
    assert_eq!(second_page.data.len(), 1);
    assert_eq!(second_page.next_cursor, None);
}

#[sqlx::test]
#[test_log::test]
async fn import_errors_invalid_cursor_falls_back_to_first_page(db: PgPool) {
    let database = Database::new(db.clone());

    for source_id in [201, 202] {
        database
            .import_errors()
            .record(ImportErrorCreate {
                run_id: Some(Uuid::now_v7()),
                severity: "error".into(),
                entity: "media".into(),
                source_id: Some(source_id),
                error_kind: "import_failure".into(),
                field: Some("cdn_url".into()),
                relation: None,
                relation_source_id: None,
                message: format!("media {source_id} failed"),
                payload: None,
            })
            .await
            .unwrap();
    }

    let app = TestRouter::as_editor(db).await;

    let response: PaginatedImportErrorsResponse = app
        .get("/import-errors?limit=1&cursor=not-a-valid-cursor")
        .await
        .into_struct()
        .await;

    assert_eq!(response.data.len(), 1);
    assert!(response.next_cursor.is_some());
    assert_eq!(response.data[0].entity, "media");
}

#[sqlx::test]
#[test_log::test]
async fn import_error_record_updates_matching_unresolved_error(db: PgPool) {
    let database = Database::new(db);
    let first = database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "warning".into(),
            entity: "media".into(),
            source_id: Some(7),
            error_kind: "import_failure".into(),
            field: Some("cdn_url".into()),
            relation: None,
            relation_source_id: None,
            message: "first failure".into(),
            payload: Some(serde_json::json!({ "attempt": 1 })),
        })
        .await
        .unwrap();

    let second = database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "error".into(),
            entity: "media".into(),
            source_id: Some(7),
            error_kind: "import_failure".into(),
            field: Some("cdn_url".into()),
            relation: None,
            relation_source_id: None,
            message: "second failure".into(),
            payload: Some(serde_json::json!({ "attempt": 2 })),
        })
        .await
        .unwrap();

    assert_eq!(second.id, first.id);
    assert_eq!(second.severity, "error");
    assert_eq!(second.message, "second failure");
    assert_eq!(second.payload, Some(serde_json::json!({ "attempt": 2 })));

    let unresolved = database.import_errors().unresolved(10).await.unwrap();
    assert_eq!(unresolved.len(), 1);
    assert_eq!(unresolved[0].id, first.id);
}

#[sqlx::test]
#[test_log::test]
async fn import_error_record_creates_new_row_after_resolution(db: PgPool) {
    let database = Database::new(db);
    let first = database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "error".into(),
            entity: "space".into(),
            source_id: Some(42),
            error_kind: "missing_relation".into(),
            field: None,
            relation: Some("location".into()),
            relation_source_id: Some(9),
            message: "location missing".into(),
            payload: None,
        })
        .await
        .unwrap();

    let resolved = database
        .import_errors()
        .resolve_for_item("space", Some(42))
        .await
        .unwrap();
    assert_eq!(resolved, 1);

    let second = database
        .import_errors()
        .record(ImportErrorCreate {
            run_id: Some(Uuid::now_v7()),
            severity: "error".into(),
            entity: "space".into(),
            source_id: Some(42),
            error_kind: "missing_relation".into(),
            field: None,
            relation: Some("location".into()),
            relation_source_id: Some(9),
            message: "location still missing".into(),
            payload: None,
        })
        .await
        .unwrap();

    assert_ne!(second.id, first.id);
    assert_eq!(
        database.import_errors().unresolved(10).await.unwrap().len(),
        1
    );
    assert_eq!(
        database.import_errors().list(10, true).await.unwrap().len(),
        1
    );
}

#[sqlx::test]
#[test_log::test]
async fn import_error_resolve_for_items_batches_source_ids(db: PgPool) {
    let database = Database::new(db);

    for source_id in [1, 2, 3] {
        database
            .import_errors()
            .record(ImportErrorCreate {
                run_id: Some(Uuid::now_v7()),
                severity: "error".into(),
                entity: "media".into(),
                source_id: Some(source_id),
                error_kind: "import_failure".into(),
                field: Some("cdn_url".into()),
                relation: None,
                relation_source_id: None,
                message: format!("media {source_id} failed"),
                payload: None,
            })
            .await
            .unwrap();
    }

    let empty_resolved = database
        .import_errors()
        .resolve_for_items("media", &[])
        .await
        .unwrap();
    assert_eq!(empty_resolved, 0);

    let resolved = database
        .import_errors()
        .resolve_for_items("media", &[1, 3, 999])
        .await
        .unwrap();
    assert_eq!(resolved, 2);

    let unresolved = database.import_errors().unresolved(10).await.unwrap();
    assert_eq!(unresolved.len(), 1);
    assert_eq!(unresolved[0].source_id, Some(2));
}
