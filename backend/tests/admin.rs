use axum::http::StatusCode;
use database::{Database, models::user::UserRole};
use serde::Deserialize;
use sqlx::PgPool;
use viernulvier_api::config::AppConfig;

use crate::common::{
    into_struct::IntoStruct,
    router::TestRouter,
    user::{create_test_user, login_user},
};

mod common;

#[derive(Deserialize)]
struct EditorResponse {
    email: String,
    role: UserRole,
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_admin_access(db: PgPool) {
    let pool = db.clone();
    let database = Database::new(pool);
    let config = AppConfig::load().unwrap();
    
    let admin_user = create_test_user(&database, "admin@test.com", UserRole::Admin).await;
    let cookie = login_user(&database, &config, &admin_user).await;
    
    let app = TestRouter::new(db).with_cookie(cookie);
    let response = app.get("/editor/me").await;
    
    assert_eq!(response.status(), StatusCode::OK);
    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "admin@test.com");
    assert_eq!(data.role, UserRole::Admin);
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_editor_access(db: PgPool) {
    let pool = db.clone();
    let database = Database::new(pool);
    let config = AppConfig::load().unwrap();
    
    let editor_user = create_test_user(&database, "editor@test.com", UserRole::Editor).await;
    let cookie = login_user(&database, &config, &editor_user).await;
    
    let app = TestRouter::new(db).with_cookie(cookie);
    let response = app.get("/editor/me").await;
    
    assert_eq!(response.status(), StatusCode::OK);
    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "editor@test.com");
    assert_eq!(data.role, UserRole::Editor);
}

#[sqlx::test]
#[test_log::test]
async fn editor_me_user_denied(db: PgPool) {
    let pool = db.clone();
    let database = Database::new(pool);
    let config = AppConfig::load().unwrap();
    
    let regular_user = create_test_user(&database, "user@test.com", UserRole::User).await;
    let cookie = login_user(&database, &config, &regular_user).await;
    
    let app = TestRouter::new(db).with_cookie(cookie);
    let response = app.get("/editor/me").await;
    
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
#[test_log::test]
async fn create_editor_admin_success(db: PgPool) {
    let pool = db.clone();
    let database = Database::new(pool);
    let config = AppConfig::load().unwrap();
    
    let admin_user = create_test_user(&database, "admin@test.com", UserRole::Admin).await;
    let cookie = login_user(&database, &config, &admin_user).await;
    
    let app = TestRouter::new(db).with_cookie(cookie);
    
    let payload = serde_json::json!({
        "username": "neweditor",
        "email": "neweditor@test.com",
        "password": "password123"
    });
    
    let response = app.post("/editor/create", &payload).await;
    assert_eq!(response.status(), StatusCode::OK);
    
    let data: EditorResponse = response.into_struct().await;
    assert_eq!(data.email, "neweditor@test.com");
    assert_eq!(data.role, UserRole::Editor);
}

#[sqlx::test]
#[test_log::test]
async fn create_editor_editor_denied(db: PgPool) {
    let pool = db.clone();
    let database = Database::new(pool);
    let config = AppConfig::load().unwrap();
    
    let editor_user = create_test_user(&database, "editor@test.com", UserRole::Editor).await;
    let cookie = login_user(&database, &config, &editor_user).await;
    
    let app = TestRouter::new(db).with_cookie(cookie);
    
    let payload = serde_json::json!({
        "username": "anothereditor",
        "email": "anothereditor@test.com",
        "password": "password123"
    });
    
    let response = app.post("/editor/create", &payload).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
