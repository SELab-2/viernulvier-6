use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::event::{EventPayload, EventPostPayload};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/events").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<EventPayload> = response.into_struct().await;
    assert_eq!(data.len(), 3);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();

    let response = app.get(&format!("/events/{}", target_id)).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.status, "confirmed");
    assert_eq!(data.production_id, Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap());
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/events/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn get_by_production(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app.get(&format!("/productions/{}/events", production_id)).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<EventPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn post_success(db: PgPool) {
    let payload = mock_post_payload();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/events", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/events", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.status, "draft");
    assert_eq!(data.production_id, Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap());
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: EventPayload = serde_json::from_value(json!({
        "id": target_id,
        "source_id": 3001,
        "created_at": "2026-03-01T09:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-05-01T17:00:00Z",
        "ends_at": "2026-05-01T20:00:00Z",
        "status": "sold_out",
        "production_id": "11111111-1111-1111-1111-111111111111"
    }))
    .expect("Failed to deserialize mock EventPayload");

    let unauth_response = unauth_app.put("/events", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/events", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.status, "sold_out");
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let missing_event: EventPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "created_at": "2026-03-01T09:00:00Z",
        "updated_at": "2026-03-01T09:00:00Z",
        "starts_at": "2026-05-01T17:00:00Z",
        "status": "confirmed",
        "production_id": "11111111-1111-1111-1111-111111111111"
    }))
    .expect("Failed to deserialize mock EventPayload");

    let unauth_response = unauth_app.put("/events", &missing_event).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/events", &missing_event).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("44444444-4444-4444-4444-444444444444").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .delete(&format!("/events/{}", target_id))
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/events/{}", target_id)).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/events/{}", target_id)).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/events/{}", Uuid::nil())).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/events/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

fn mock_post_payload() -> EventPostPayload {
    serde_json::from_value(json!({
        "source_id": 9999,
        "created_at": "2026-03-12T10:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-07-01T19:00:00Z",
        "ends_at": "2026-07-01T22:00:00Z",
        "status": "draft",
        "production_id": "11111111-1111-1111-1111-111111111111"
    }))
    .expect("Failed to deserialize mock EventPostPayload")
}
