use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::production::{ProductionPayload, ProductionPostPayload};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/productions").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.len(), 5);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app.get(&format!("/productions/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ProductionPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "heavy-metal-knitting-2026");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/productions/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn post_success(db: PgPool) {
    let payload = mock_post_payload();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/productions", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/productions", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ProductionPayload = response.into_struct().await;
    assert_eq!(data.slug, "test-post-production");
    assert_eq!(data.title_nl.as_deref(), Some("Nieuwe Test Productie"));
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: ProductionPayload = serde_json::from_value(json!({
        "id": target_id,
        "slug": "minimal-event-test",
        "title_nl": "Aangepaste Titel"
    }))
    .expect("Failed to deserialize mock ProductionPayload");

    let unauth_response = unauth_app.put("/productions", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/productions", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ProductionPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.title_nl.as_deref(), Some("Aangepaste Titel"));
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let missing_production: ProductionPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "slug": "ghost-production"
    }))
    .expect("Failed to deserialize mock ProductionPayload");

    let unauth_response = unauth_app.put("/productions", &missing_production).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/productions", &missing_production).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("22222222-2222-2222-2222-222222222222").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .delete(&format!("/productions/{target_id}"))
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/productions/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/productions/{target_id}")).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .delete(&format!("/productions/{}", Uuid::nil()))
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/productions/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

/// return a test payload for `ProductionPostPayload`
fn mock_post_payload() -> ProductionPostPayload {
    serde_json::from_value(json!({
        "source_id": 9999,
        "slug": "test-post-production",
        "title_nl": "Nieuwe Test Productie",
        "title_en": "New Test Production"
    }))
    .expect("Failed to deserialize mock ProductionPostPayload")
}
