#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::{
    hall::{HallPayload, HallPostPayload},
    paginated::PaginatedResponse,
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/halls").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<HallPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 4);
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/halls?limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<HallPayload> = response.into_struct().await;

    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();
    let url = format!("/halls?limit=2&cursor={cursor}");

    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 2
    let page2: PaginatedResponse<HallPayload> = response.into_struct().await;

    assert_eq!(page2.data.len(), 2, "page 2 should respect the limit of 2");
    assert_ne!(page1.data[0].id, page2.data[0].id);
    assert!(page2.next_cursor.is_none(), "last page has no cursor");
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_search_single_result(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/halls?q=zaal%20a%20search").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<HallPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "30000000-0000-0000-0000-000000000001"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_search_no_results(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/halls?q=rustlang").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<HallPayload> = response.into_struct().await;
    assert!(
        data.data.is_empty(),
        "expected no results for unmatched search term"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_search_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/halls?q=HALL_SEARCH_TEST&limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    let page1: PaginatedResponse<HallPayload> = response.into_struct().await;
    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();

    let response = app
        .get(&format!("/halls?q=HALL_SEARCH_TEST&limit=2&cursor={cursor}"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let page2: PaginatedResponse<HallPayload> = response.into_struct().await;
    assert_eq!(
        page2.data.len(),
        1,
        "page 2 should have the 1 remaining item"
    );
    assert!(
        page2.next_cursor.is_none(),
        "last page should have no cursor"
    );

    let mut all_ids = vec![page1.data[0].id, page1.data[1].id, page2.data[0].id];
    let original_length = all_ids.len();
    all_ids.sort();
    all_ids.dedup();
    assert_eq!(
        all_ids.len(),
        original_length,
        "all paginated search results must be unique"
    );
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("30000000-0000-0000-0000-000000000001").unwrap();

    let response = app.get(&format!("/halls/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: HallPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name, "Zaal A SEARCH");
    assert_eq!(data.slug, "zaal-a");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/halls/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations", "spaces"))]
#[test_log::test]
async fn post_success(db: PgPool) {
    let payload = mock_post_payload();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/halls", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/halls", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: HallPayload = response.into_struct().await;
    assert_eq!(data.name, "Test Zaal");
    assert_eq!(data.slug, "test-zaal");
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("30000000-0000-0000-0000-000000000003").unwrap();
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: HallPayload = serde_json::from_value(json!({
        "id": target_id,
        "name": "Bijgewerkte Zaal",
        "slug": "bijgewerkte-zaal"
    }))
    .expect("Failed to deserialize mock HallPayload");

    let unauth_response = unauth_app.put("/halls", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/halls", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: HallPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name, "Bijgewerkte Zaal");
    assert_eq!(data.slug, "bijgewerkte-zaal");
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let missing_hall: HallPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "name": "Ghost Zaal",
        "slug": "ghost-zaal"
    }))
    .expect("Failed to deserialize mock HallPayload");

    let unauth_response = unauth_app.put("/halls", &missing_hall).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/halls", &missing_hall).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations", "spaces", "halls"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("30000000-0000-0000-0000-000000000002").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/halls/{target_id}")).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/halls/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/halls/{target_id}")).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/halls/{}", Uuid::nil())).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/halls/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

fn mock_post_payload() -> HallPostPayload {
    serde_json::from_value(json!({
        "name": "Test Zaal",
        "slug": "test-zaal",
        "space_id": "20000000-0000-0000-0000-000000000001"
    }))
    .expect("Failed to deserialize mock HallPostPayload")
}
