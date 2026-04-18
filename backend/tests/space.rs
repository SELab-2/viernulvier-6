#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::dto::{
    paginated::PaginatedResponse,
    space::{SpacePayload, SpacePostPayload},
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/spaces").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<SpacePayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 3);
}

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn get_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/spaces?limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<SpacePayload> = response.into_struct().await;

    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();
    let url = format!("/spaces?limit=2&cursor={cursor}");

    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 2
    let page2: PaginatedResponse<SpacePayload> = response.into_struct().await;

    assert_eq!(page2.data.len(), 1, "page 2 should have 1 item");
    assert_ne!(page1.data[0].id, page2.data[0].id);
    assert!(page2.next_cursor.is_none(), "last page has no cursor");
}

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000001").unwrap();

    let response = app.get(&format!("/spaces/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: SpacePayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name_nl, "Grote Zaal");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/spaces/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn post_success(db: PgPool) {
    let payload = mock_post_payload();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/spaces", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/spaces", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: SpacePayload = response.into_struct().await;
    assert_eq!(data.name_nl, "Test Ruimte");
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000003").unwrap();
    let location_id = Uuid::from_str("10000000-0000-0000-0000-000000000002").unwrap();
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: SpacePayload = serde_json::from_value(json!({
        "id": target_id,
        "name_nl": "Bijgewerkte Ruimte",
        "location_id": location_id
    }))
    .expect("Failed to deserialize mock SpacePayload");

    let unauth_response = unauth_app.put("/spaces", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/spaces", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: SpacePayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name_nl, "Bijgewerkte Ruimte");
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;
    let location_id = Uuid::from_str("10000000-0000-0000-0000-000000000001").unwrap();

    let missing_space: SpacePayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "name_nl": "Ghost Ruimte",
        "location_id": location_id
    }))
    .expect("Failed to deserialize mock SpacePayload");

    let unauth_response = unauth_app.put("/spaces", &missing_space).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/spaces", &missing_space).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000002").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/spaces/{target_id}")).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/spaces/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/spaces/{target_id}")).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/spaces/{}", Uuid::nil())).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/spaces/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

fn mock_post_payload() -> SpacePostPayload {
    serde_json::from_value(json!({
        "name_nl": "Test Ruimte",
        "location_id": "10000000-0000-0000-0000-000000000001"
    }))
    .expect("Failed to deserialize mock SpacePostPayload")
}
