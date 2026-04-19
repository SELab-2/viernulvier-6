#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::dto::{
    event::{EventPayload, EventPostPayload},
    paginated::PaginatedResponse,
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/events").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: PaginatedResponse<EventPayload> = response.into_struct().await;
    assert_eq!(data.data.len(), 3);
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_paginated(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/events?limit=2").await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 1
    let page1: PaginatedResponse<EventPayload> = response.into_struct().await;

    assert_eq!(page1.data.len(), 2, "page 1 should respect the limit of 2");
    assert!(page1.next_cursor.is_some(), "there should be a next cursor");

    let cursor = page1.next_cursor.unwrap();
    let url = format!("/events?limit=2&cursor={cursor}");

    let response = app.get(&url).await;
    assert_eq!(response.status(), StatusCode::OK);

    // page 2
    let page2: PaginatedResponse<EventPayload> = response.into_struct().await;

    assert_eq!(page2.data.len(), 1, "page 2 should have only the last item");
    assert_ne!(page1.data[0].id, page2.data[0].id);
    assert!(page2.next_cursor.is_none(), "last page has no cursor");
}

#[sqlx::test(fixtures("productions", "events", "prices"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();

    let response = app.get(&format!("/events/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.status, "confirmed");
    assert_eq!(
        data.production_id,
        Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap()
    );
    assert_eq!(data.prices.len(), 1);
    let price = data.prices.first().expect("event should contain one price");
    assert_eq!(price.amount_cents, 1850);
    assert_eq!(price.available, 42);
    assert_eq!(price.price.description_nl.as_deref(), Some("Standaard"));
    assert_eq!(price.rank.description_nl.as_deref(), Some("Rang 1"));
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/events/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn get_by_production(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!("/productions/{production_id}/events"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<EventPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);
}

#[sqlx::test(fixtures("productions", "events"))]
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
    assert_eq!(
        data.production_id,
        Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap()
    );
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("productions", "events", "prices"))]
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
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": [
            {
                "id": "88888888-8888-8888-8888-888888888888",
                "source_id": 8001,
                "created_at": "2026-03-01T09:00:00Z",
                "updated_at": "2026-03-12T10:00:00Z",
                "available": 21,
                "amount_cents": 2050,
                "box_office_id": "BOX-PRICE-UPDATED",
                "contingent_id": 12,
                "expires_at": "2026-05-01T18:30:00Z",
                "price": {
                    "id": "66666666-6666-6666-6666-666666666666",
                    "source_id": 6001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "type": "ticket",
                    "visibility": "public",
                    "code": "standard",
                    "description_nl": "Standaard aangepast",
                    "description_en": "Standard updated",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 1,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "id": "77777777-7777-7777-7777-777777777777",
                    "source_id": 7001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "description_nl": "Rang 1 aangepast",
                    "description_en": "Rank 1 updated",
                    "code": "rank_1",
                    "position": 1,
                    "sold_out_buffer": null
                }
            }
        ]
    }))
    .expect("Failed to deserialize mock EventPayload");

    let unauth_response = unauth_app.put("/events", &update_payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/events", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.status, "sold_out");
    assert_eq!(data.prices.len(), 1);
    let price = data.prices.first().expect("event should contain one price");
    assert_eq!(price.amount_cents, 2050);
    assert_eq!(price.available, 21);
    assert_eq!(
        price.price.description_nl.as_deref(),
        Some("Standaard aangepast")
    );
    assert_eq!(
        price.rank.description_nl.as_deref(),
        Some("Rang 1 aangepast")
    );
}

#[sqlx::test(fixtures("productions", "events", "prices"))]
#[test_log::test]
async fn put_success_removes_prices_when_empty_array_provided(db: PgPool) {
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();
    let app = TestRouter::as_editor(db).await;

    let update_payload: EventPayload = serde_json::from_value(json!({
        "id": target_id,
        "source_id": 3001,
        "created_at": "2026-03-01T09:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-05-01T17:00:00Z",
        "ends_at": "2026-05-01T20:00:00Z",
        "status": "confirmed",
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": []
    }))
    .expect("Failed to deserialize mock EventPayload");

    let response = app.put("/events", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert!(data.prices.is_empty());
}

#[sqlx::test(fixtures("productions", "events", "prices"))]
#[test_log::test]
async fn put_success_updates_existing_and_adds_new_price(db: PgPool) {
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();
    let app = TestRouter::as_editor(db).await;

    let update_payload: EventPayload = serde_json::from_value(json!({
        "id": target_id,
        "source_id": 3001,
        "created_at": "2026-03-01T09:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-05-01T17:00:00Z",
        "ends_at": "2026-05-01T20:00:00Z",
        "status": "confirmed",
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": [
            {
                "id": "88888888-8888-8888-8888-888888888888",
                "source_id": 8001,
                "created_at": "2026-03-01T09:00:00Z",
                "updated_at": "2026-03-12T10:00:00Z",
                "available": 21,
                "amount_cents": 2050,
                "box_office_id": "BOX-PRICE-UPDATED",
                "contingent_id": 12,
                "expires_at": "2026-05-01T18:30:00Z",
                "price": {
                    "id": "66666666-6666-6666-6666-666666666666",
                    "source_id": 6001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "type": "ticket",
                    "visibility": "public",
                    "code": "standard",
                    "description_nl": "Standaard aangepast",
                    "description_en": "Standard updated",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 1,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "id": "77777777-7777-7777-7777-777777777777",
                    "source_id": 7001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "description_nl": "Rang 1 aangepast",
                    "description_en": "Rank 1 updated",
                    "code": "rank_1",
                    "position": 1,
                    "sold_out_buffer": null
                }
            },
            {
                "source_id": 8100,
                "available": 120,
                "amount_cents": 1250,
                "box_office_id": "BOX-NEW-PRICE",
                "contingent_id": 5,
                "expires_at": "2026-05-01T18:00:00Z",
                "price": {
                    "source_id": 6100,
                    "type": "ticket",
                    "visibility": "public",
                    "code": "student",
                    "description_nl": "Student",
                    "description_en": "Student",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 2,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "source_id": 7100,
                    "description_nl": "Tickets",
                    "description_en": "Tickets",
                    "code": "tickets",
                    "position": 2,
                    "sold_out_buffer": null
                }
            }
        ]
    }))
    .expect("Failed to deserialize mock EventPayload");

    let response = app.put("/events", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.prices.len(), 2);
    assert!(data.prices.iter().any(|price| price.amount_cents == 2050));
    assert!(
        data.prices
            .iter()
            .any(|price| price.price.code.as_deref() == Some("student"))
    );
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn post_success_with_prices(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let payload: EventPostPayload = serde_json::from_value(json!({
        "source_id": 9998,
        "created_at": "2026-03-12T10:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-07-01T19:00:00Z",
        "ends_at": "2026-07-01T22:00:00Z",
        "status": "draft",
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": [
            {
                "source_id": 8100,
                "available": 120,
                "amount_cents": 1250,
                "box_office_id": "BOX-NEW-PRICE",
                "contingent_id": 5,
                "expires_at": "2026-07-01T18:00:00Z",
                "price": {
                    "source_id": 6100,
                    "type": "ticket",
                    "visibility": "public",
                    "code": "student",
                    "description_nl": "Student",
                    "description_en": "Student",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 1,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "source_id": 7100,
                    "description_nl": "Tickets",
                    "description_en": "Tickets",
                    "code": "tickets",
                    "position": 1,
                    "sold_out_buffer": null
                }
            }
        ]
    }))
    .expect("Failed to deserialize mock EventPostPayload");

    let unauth_response = unauth_app.post("/events", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.post("/events", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: EventPayload = response.into_struct().await;
    assert_eq!(data.status, "draft");
    assert_eq!(data.prices.len(), 1);
    let price = data.prices.first().expect("event should contain one price");
    assert_eq!(price.amount_cents, 1250);
    assert_eq!(price.price.code.as_deref(), Some("student"));
    assert_eq!(price.rank.code, "tickets");
}

#[sqlx::test(fixtures("productions", "events", "prices"))]
#[test_log::test]
async fn put_rejects_event_price_from_another_event(db: PgPool) {
    let target_id = Uuid::from_str("33333333-3333-3333-3333-333333333333").unwrap();
    let app = TestRouter::as_editor(db).await;

    let update_payload: EventPayload = serde_json::from_value(json!({
        "id": target_id,
        "source_id": 3001,
        "created_at": "2026-03-01T09:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-05-01T17:00:00Z",
        "ends_at": "2026-05-01T20:00:00Z",
        "status": "confirmed",
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": [
            {
                "id": "99999999-9999-9999-9999-999999999999",
                "source_id": 8002,
                "created_at": "2026-03-02T09:00:00Z",
                "updated_at": "2026-03-12T10:00:00Z",
                "available": 10,
                "amount_cents": 1500,
                "box_office_id": "BOX-PRICE-002",
                "contingent_id": null,
                "expires_at": "2026-05-15T18:00:00Z",
                "price": {
                    "id": "66666666-6666-6666-6666-666666666666",
                    "source_id": 6001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "type": "ticket",
                    "visibility": "public",
                    "code": "standard",
                    "description_nl": "Standaard",
                    "description_en": "Standard",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 1,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "id": "77777777-7777-7777-7777-777777777777",
                    "source_id": 7001,
                    "created_at": "2026-03-01T09:00:00Z",
                    "updated_at": "2026-03-12T10:00:00Z",
                    "description_nl": "Rang 1",
                    "description_en": "Rank 1",
                    "code": "rank_1",
                    "position": 1,
                    "sold_out_buffer": null
                }
            }
        ]
    }))
    .expect("Failed to deserialize mock EventPayload");

    let response = app.put("/events", &update_payload).await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn post_rejects_malformed_nested_price_payload(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload = json!({
        "source_id": 9998,
        "created_at": "2026-03-12T10:00:00Z",
        "updated_at": "2026-03-12T10:00:00Z",
        "starts_at": "2026-07-01T19:00:00Z",
        "ends_at": "2026-07-01T22:00:00Z",
        "status": "draft",
        "production_id": "11111111-1111-1111-1111-111111111111",
        "prices": [
            {
                "source_id": 8100,
                "available": 120,
                "price": {
                    "source_id": 6100,
                    "type": "ticket",
                    "visibility": "public",
                    "code": "student",
                    "description_nl": "Student",
                    "description_en": "Student",
                    "minimum": 0,
                    "maximum": null,
                    "step": 1,
                    "order": 1,
                    "auto_select_combo": false,
                    "include_in_price_range": true,
                    "cineville_box": false,
                    "membership": null
                },
                "rank": {
                    "source_id": 7100,
                    "description_nl": "Tickets",
                    "description_en": "Tickets",
                    "code": "tickets",
                    "position": 1,
                    "sold_out_buffer": null
                }
            }
        ]
    });

    let response = app.post("/events", &payload).await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
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

#[sqlx::test(fixtures("productions", "events"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("44444444-4444-4444-4444-444444444444").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.delete(&format!("/events/{target_id}")).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/events/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/events/{target_id}")).await;
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
