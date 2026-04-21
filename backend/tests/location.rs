#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::dto::{
    location::{LocationPayload, LocationPostPayload},
    paginated::PaginatedResponse,
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/locations").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<LocationPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 5);
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations?limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<LocationPayload> = response.into_struct().await;

    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();
    let url = format!("/locations?limit=2&cursor={cursor}");

    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 2
    let page2: PaginatedResponse<LocationPayload> = response.into_struct().await;

    assert_eq!(page2.data.len(), 2, "page 2 should respect the limit of 2");
    assert_ne!(page1.data[0].id, page2.data[0].id);

    let cursor = page2.next_cursor.unwrap();
    let url = format!("/locations?limit=2&cursor={cursor}");

    // page 3 (last)
    let page3: PaginatedResponse<LocationPayload> = app.get(&url).await.into_struct().await;

    assert_eq!(page3.data.len(), 1, "page 3 should have only the last item");
    assert!(page3.next_cursor.is_none(), "last page has no cursor");
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_search_single_result(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations?q=vooruit").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<LocationPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "10000000-0000-0000-0000-000000000001"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_search_no_results(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations?q=rustlang").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<LocationPayload> = response.into_struct().await;
    assert!(
        data.data.is_empty(),
        "expected no results for unmatched search term"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_search_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations?q=LOCATION_SEARCH_TEST&limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<LocationPayload> = response.into_struct().await;
    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();

    // page 2
    let response = app
        .get(&format!(
            "/locations?q=LOCATION_SEARCH_TEST&limit=2&cursor={cursor}"
        ))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let page2: PaginatedResponse<LocationPayload> = response.into_struct().await;
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

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("10000000-0000-0000-0000-000000000001").unwrap();

    let response = app.get(&format!("/locations/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: LocationPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name.as_deref(), Some("De Vooruit SEARCH"));
    assert_eq!(data.translations.len(), 2);
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/locations/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_one_by_slug_success(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations/slug/de-vooruit").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: LocationPayload = response.into_struct().await;
    assert_eq!(data.name.as_deref(), Some("De Vooruit SEARCH"));
    assert_eq!(data.slug.as_deref(), Some("de-vooruit"));
    assert_eq!(data.translations.len(), 2);
    assert_eq!(data.id.to_string(),"10000000-0000-0000-0000-000000000001");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_by_slug_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/locations/slug/does-not-exist").await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn post_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let payload = mock_post_payload();

    let unauthenticated_response = unauthenticated_app.post("/locations", &payload).await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/locations", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: LocationPayload = response.into_struct().await;
    assert_eq!(data.name.as_deref(), Some("Test Locatie"));
    assert_eq!(data.city.as_deref(), Some("Gent"));
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("10000000-0000-0000-0000-000000000003").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: LocationPayload = serde_json::from_value(json!({
        "id": target_id,
        "name": "Bijgewerkte Locatie",
        "city": "Gent",
        "translations": []
    }))
    .expect("Failed to deserialize mock LocationPayload");

    let unauthenticated_response = unauthenticated_app.put("/locations", &update_payload).await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/locations", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: LocationPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.name.as_deref(), Some("Bijgewerkte Locatie"));
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let missing_location: LocationPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "translations": []
    }))
    .expect("Failed to deserialize mock LocationPayload");

    let unauthenticated_response = unauthenticated_app
        .put("/locations", &missing_location)
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/locations", &missing_location).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("10000000-0000-0000-0000-000000000002").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let unauthenticated_response = unauthenticated_app
        .delete(&format!("/locations/{target_id}"))
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/locations/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/locations/{target_id}")).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let unauthenticated_response = unauthenticated_app
        .delete(&format!("/locations/{}", Uuid::nil()))
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/locations/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

fn mock_post_payload() -> LocationPostPayload {
    serde_json::from_value(json!({
        "name": "Test Locatie",
        "city": "Gent",
        "country": "Belgium",
        "translations": []
    }))
    .expect("Failed to deserialize mock LocationPostPayload")
}
