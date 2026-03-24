use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::location::{LocationPayload, LocationPostPayload};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("locations"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/locations").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<LocationPayload> = response.into_struct().await;
    assert_eq!(data.len(), 5);
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
    assert_eq!(data.name.as_deref(), Some("De Vooruit"));
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/locations/{}", Uuid::nil())).await;
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
        "city": "Gent"
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
        "id": Uuid::nil()
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
        "country": "Belgium"
    }))
    .expect("Failed to deserialize mock LocationPostPayload")
}
