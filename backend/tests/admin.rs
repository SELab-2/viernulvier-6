use axum::http::StatusCode;
use database::models::user::UserRole;
use serde::Deserialize;
use sqlx::PgPool;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[derive(Deserialize)]
struct EditorResponse {
    email: String,
    role: UserRole,
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
