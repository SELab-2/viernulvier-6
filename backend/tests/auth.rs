#![allow(clippy::indexing_slicing)]

mod common;

use axum::body::Body;
use axum::http::Method;
use axum::http::header;
use axum::response::Response;
use database::Database;
use database::models::user::UserRole;
use sqlx::PgPool;

use crate::common::router::TestRouter;
use crate::common::user::create_test_user;

async fn test_router(db: PgPool) -> TestRouter {
    TestRouter::new(db)
}

fn get_cookie(response: &Response<Body>, name: &str) -> Option<String> {
    response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .find_map(|v| {
            let value = v.to_str().ok()?;
            if value.starts_with(&format!("{name}=")) {
                let cookie = value.split(';').next()?;
                Some(cookie.to_string())
            } else {
                None
            }
        })
}

async fn extract_cookies(response: &Response<Body>) -> String {
    response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .filter_map(|v| v.split(';').next())
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .join("; ")
}

#[derive(serde::Deserialize)]
struct AuthResponse {
    message: String,
    success: bool,
}

#[sqlx::test]
#[test_log::test]
async fn login_success_returns_cookies(db: PgPool) {
    let app = test_router(db.clone()).await;
    let database = Database::new(db);

    create_test_user(&database, "login-test@test.com", UserRole::Admin).await;

    let response = app
        .post(
            "/auth/login",
            serde_json::json!({
                "email": "login-test@test.com",
                "password": "password123"
            }),
        )
        .await;

    assert_eq!(response.status(), 200);

    let access_cookie = get_cookie(&response, "access_token");
    assert!(access_cookie.is_some());
    assert!(access_cookie.unwrap().starts_with("access_token="));

    let refresh_cookie = get_cookie(&response, "refresh_token");
    assert!(refresh_cookie.is_some());

    let session_cookie = get_cookie(&response, "session_present");
    assert!(session_cookie.is_some());
    assert_eq!(session_cookie.unwrap(), "session_present=true");

    let json: AuthResponse = axum::body::to_bytes(response.into_body(), 10_000_000)
        .await
        .map(|b| serde_json::from_slice(&b).unwrap())
        .unwrap();
    assert!(json.success);
}

#[sqlx::test]
#[test_log::test]
async fn login_wrong_password_returns_401(db: PgPool) {
    let app = test_router(db.clone()).await;
    let database = Database::new(db);

    create_test_user(&database, "wrong-pass@test.com", UserRole::Admin).await;

    let response = app
        .post(
            "/auth/login",
            serde_json::json!({
                "email": "wrong-pass@test.com",
                "password": "wrong-password"
            }),
        )
        .await;

    assert_eq!(response.status(), 401);
}

#[sqlx::test]
#[test_log::test]
async fn login_nonexistent_user_returns_401(db: PgPool) {
    let app = test_router(db.clone()).await;

    let response = app
        .post(
            "/auth/login",
            serde_json::json!({
                "email": "nonexistent@test.com",
                "password": "password123"
            }),
        )
        .await;

    assert_eq!(response.status(), 401);
}

#[sqlx::test]
#[test_log::test]
async fn refresh_success_returns_new_access_cookie(db: PgPool) {
    let app = test_router(db.clone()).await;
    let database = Database::new(db.clone());

    create_test_user(&database, "refresh-test@test.com", UserRole::Admin).await;

    let login_response = app
        .post(
            "/auth/login",
            serde_json::json!({
                "email": "refresh-test@test.com",
                "password": "password123"
            }),
        )
        .await;

    assert_eq!(login_response.status(), 200);

    let cookies = extract_cookies(&login_response).await;

    let response = app
        .request_with_cookies(Method::POST, "/auth/refresh", None::<()>, &cookies)
        .await;

    assert_eq!(response.status(), 200);

    let new_access = get_cookie(&response, "access_token");
    assert!(new_access.is_some());

    let json: AuthResponse = axum::body::to_bytes(response.into_body(), 10_000_000)
        .await
        .map(|b| serde_json::from_slice(&b).unwrap())
        .unwrap();
    assert!(json.success);
}

#[sqlx::test]
#[test_log::test]
async fn refresh_without_cookie_returns_401(db: PgPool) {
    let app = test_router(db.clone()).await;

    let response = app.post("/auth/refresh", ()).await;

    assert_eq!(response.status(), 401);
}

#[sqlx::test]
#[test_log::test]
async fn logout_clears_cookies(db: PgPool) {
    let app = test_router(db.clone()).await;
    let database = Database::new(db.clone());

    create_test_user(&database, "logout-test@test.com", UserRole::Admin).await;

    let login_response = app
        .post(
            "/auth/login",
            serde_json::json!({
                "email": "logout-test@test.com",
                "password": "password123"
            }),
        )
        .await;

    let cookies = extract_cookies(&login_response).await;

    let app = TestRouter::new(db);
    let response = app
        .request_with_cookies(Method::POST, "/auth/logout", None::<()>, &cookies)
        .await;

    assert_eq!(response.status(), 200);

    let access_cookie = get_cookie(&response, "access_token");
    // Logout clears the access cookie
    if let Some(cookie) = access_cookie {
        let value = cookie.strip_prefix("access_token=").unwrap_or("");
        assert!(value.is_empty());
    }
}

#[sqlx::test]
#[test_log::test]
async fn logout_without_auth_still_succeeds(db: PgPool) {
    let app = test_router(db.clone()).await;

    let response = app.post("/auth/logout", ()).await;

    assert_eq!(response.status(), 200);
}
