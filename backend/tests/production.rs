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

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn get_search_filter_discipline(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?discipline=music&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(
        data.data.len(),
        2,
        "Expected 2 productions with discipline 'music'"
    );

    let ids: Vec<String> = data.data.iter().map(|p| p.id.to_string()).collect();
    assert!(ids.contains(&"11111111-1111-1111-1111-111111111111".to_string()));
    assert!(ids.contains(&"44444444-4444-4444-4444-444444444444".to_string()));
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn get_search_filter_format(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?format=workshop&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "11111111-1111-1111-1111-111111111111"
    );
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn get_search_filter_theme(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?theme=politics&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "22222222-2222-2222-2222-222222222222"
    );
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn get_search_filter_audience(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?audience=all-ages&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "55555555-5555-5555-5555-555555555555"
    );
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_search_filter_location(db: PgPool) {
    let app = TestRouter::new(db);

    // Adjust the location string to match whatever slug/ID convention you use for "De Vooruit"
    let response = app.get("/productions?location=de-vooruit&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    // Assuming 'jazz-night-de-vooruit' matches this location
    assert!(
        !data.data.is_empty(),
        "Expected at least one production for this location"
    );
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_search_filter_date_from(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?date_from=2026-05-02&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 2);

    let ids: Vec<String> = data.data.iter().map(|p| p.id.to_string()).collect();
    assert!(ids.contains(&"11111111-1111-1111-1111-111111111111".to_string()));
    assert!(ids.contains(&"22222222-2222-2222-2222-222222222222".to_string()));
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_search_filter_date_to(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?date_to=2026-05-2&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "11111111-1111-1111-1111-111111111111"
    );
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_search_sort(db: PgPool) {
    let app = TestRouter::new(db);

    // Assuming your Sort enum deserializes from something like "asc" or "desc"
    let response = app.get("/productions?sort=recent&limit=10").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert!(!data.data.is_empty(), "Expected results to test sorting");

    assert_eq!(
        data.data[0].id.to_string(),
        "55555555-5555-5555-5555-555555555555"
    );
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn get_search_filter_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    // Filter by music (yields 2 results), but set limit to 1
    let response = app.get("/productions?discipline=music&limit=1").await;
    assert_eq!(response.status(), StatusCode::OK);

    // Page 1
    let page1: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(page1.data.len(), 1, "Page 1 should respect the limit of 1");
    assert!(
        page1.next_cursor.is_some(),
        "There should be a next cursor for the remaining music production"
    );

    let cursor = page1.next_cursor.unwrap();

    // Page 2
    let url = format!("/productions?discipline=music&limit=1&cursor={cursor}");
    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    let page2: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(
        page2.data.len(),
        1,
        "Page 2 should have the 1 remaining item"
    );
    assert!(
        page2.next_cursor.is_none(),
        "Last page should have no cursor"
    );

    // Ensure the results were different
    assert_ne!(
        page1.data[0].id, page2.data[0].id,
        "Pagination should yield distinct items"
    );
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_search_single_result(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?q=jazz").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 1);
    assert_eq!(
        data.data[0].id.to_string(),
        "44444444-4444-4444-4444-444444444444"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_search_no_results(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?q=rustlang").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert!(
        data.data.is_empty(),
        "expected no results for unmatched search term"
    );
    assert!(data.next_cursor.is_none());
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_search_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/productions?q=TITLE_SEARCH_TEST&limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<ProductionPayload> = response.into_struct().await;
    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();

    // page 2
    let response = app
        .get(&format!(
            "/productions?q=TITLE_SEARCH_TEST&limit=2&cursor={cursor}"
        ))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let page2: PaginatedResponse<ProductionPayload> = response.into_struct().await;
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
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .unwrap();
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
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .unwrap();
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
