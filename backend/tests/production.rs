#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::{
    paginated::PaginatedResponse,
    production::{ProductionPayload, ProductionPostPayload},
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/productions").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 5);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<ProductionPayload> = response.into_struct().await;

    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();
    let url = format!("/productions?limit=2&cursor={cursor}");

    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 2
    let page2: PaginatedResponse<ProductionPayload> = response.into_struct().await;

    assert_eq!(page2.data.len(), 2, "page 1 should respect the limit of 2");
    assert_ne!(page1.data[0].id, page2.data[0].id);

    let cursor = page2.next_cursor.unwrap();
    let url = format!("/productions?limit=2&cursor={cursor}");

    // page 3 (last)
    let page3: PaginatedResponse<ProductionPayload> = app.get(&url).await.into_struct().await;

    assert_eq!(page3.data.len(), 1, "page 3 should have only the last item");
    assert!(page3.next_cursor.is_none(), "last page has no cursor");
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
    let nl = data.translations.iter().find(|t| t.language_code == "nl").unwrap();
    assert_eq!(nl.title.as_deref(), Some("Nieuwe Test Productie"));
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
        "translations": [
            { "language_code": "nl", "title": "Aangepaste Titel" }
        ]
    }))
    .expect("Failed to deserialize mock ProductionPayload");

    let unauth_response = unauth_app.put("/productions", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/productions", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ProductionPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    let nl = data.translations.iter().find(|t| t.language_code == "nl").unwrap();
    assert_eq!(nl.title.as_deref(), Some("Aangepaste Titel"));
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let missing_production: ProductionPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "slug": "ghost-production",
        "translations": []
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
        "translations": [
            { "language_code": "nl", "title": "Nieuwe Test Productie" },
            { "language_code": "en", "title": "New Test Production" }
        ]
    }))
    .expect("Failed to deserialize mock ProductionPostPayload")
}
