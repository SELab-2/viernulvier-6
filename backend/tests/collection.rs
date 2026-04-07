use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use std::str::FromStr;
use uuid::Uuid;
use viernulvier_api::dto::collection::{
    CollectionItemPayload, CollectionItemPostPayload, CollectionPayload, CollectionPostPayload,
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/collections").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<CollectionPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);
}

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000001").unwrap();

    let response = app.get(&format!("/collections/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: CollectionPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "zomerselectie");
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    assert_eq!(nl.title, "Zomerselectie");
    assert_eq!(data.items.len(), 2);
    assert_eq!(data.items[0].position, 1);
    assert_eq!(data.items[1].position, 2);
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/collections/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn post_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let payload = mock_post_payload();

    let unauthenticated_response = unauthenticated_app.post("/collections", &payload).await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/collections", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: CollectionPayload = response.into_struct().await;
    assert_eq!(data.slug, "test-selectie");
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    let en = data
        .translations
        .iter()
        .find(|t| t.language_code == "en")
        .expect("English translation not found");
    assert_eq!(nl.title, "Test Selectie");
    assert_eq!(en.title, "Test Selection");
    assert_eq!(nl.description, "");
    assert_eq!(en.description, "");
    assert!(data.items.is_empty());
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000002").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let update_payload: CollectionPayload = serde_json::from_value(json!({
        "id": target_id,
        "slug": "dans-2025-bijgewerkt",
        "translations": [
            { "language_code": "nl", "title": "Dans 2025 (bijgewerkt)", "description": "" },
            { "language_code": "en", "title": "Dance 2025 (updated)", "description": "" }
        ],
        "items": [],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize CollectionPayload");

    let unauthenticated_response = unauthenticated_app
        .put("/collections", &update_payload)
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/collections", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: CollectionPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "dans-2025-bijgewerkt");
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    assert_eq!(nl.title, "Dans 2025 (bijgewerkt)");
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let missing: CollectionPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "slug": "missing",
        "translations": [
            { "language_code": "nl", "title": "Missing", "description": "" },
            { "language_code": "en", "title": "Missing", "description": "" }
        ],
        "items": [],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize CollectionPayload");

    let response = app.put("/collections", &missing).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("20000000-0000-0000-0000-000000000001").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let unauthenticated_response = unauthenticated_app
        .delete(&format!("/collections/{target_id}"))
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/collections/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/collections/{target_id}")).await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app.delete(&format!("/collections/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn post_item_success(db: PgPool) {
    let collection_id = Uuid::from_str("20000000-0000-0000-0000-000000000002").unwrap();
    let content_id = Uuid::from_str("99999999-0000-0000-0000-000000000001").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let item_payload: CollectionItemPostPayload = serde_json::from_value(json!({
        "content_id": content_id,
        "content_type": "event",
        "position": 1,
        "translations": [
            { "language_code": "nl", "comment": null },
            { "language_code": "en", "comment": null }
        ]
    }))
    .expect("Failed to deserialize CollectionItemPostPayload");

    let unauthenticated_response = unauthenticated_app
        .post(
            &format!("/collections/{collection_id}/items"),
            &item_payload,
        )
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app
        .post(
            &format!("/collections/{collection_id}/items"),
            &item_payload,
        )
        .await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: CollectionItemPayload = response.into_struct().await;
    assert_eq!(data.content_id, content_id);
    assert_eq!(data.position, 1);
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("collections"))]
#[test_log::test]
async fn delete_item_success(db: PgPool) {
    let collection_id = Uuid::from_str("20000000-0000-0000-0000-000000000001").unwrap();
    let item_id = Uuid::from_str("20000000-0000-0000-0001-000000000001").unwrap();

    let unauthenticated_app = TestRouter::new(db.clone());
    let unauthenticated_response = unauthenticated_app
        .delete(&format!("/collections/{collection_id}/items/{item_id}"))
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app
        .delete(&format!("/collections/{collection_id}/items/{item_id}"))
        .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get(&format!("/collections/{collection_id}")).await;
    let data: CollectionPayload = verify_res.into_struct().await;
    assert_eq!(data.items.len(), 1);
}

#[sqlx::test]
#[test_log::test]
async fn delete_item_not_found(db: PgPool) {
    let collection_id = Uuid::nil();
    let app = TestRouter::as_editor(db).await;

    let response = app
        .delete(&format!(
            "/collections/{collection_id}/items/{}",
            Uuid::nil()
        ))
        .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

fn mock_post_payload() -> CollectionPostPayload {
    serde_json::from_value(json!({
        "slug": "test-selectie",
        "translations": [
            { "language_code": "nl", "title": "Test Selectie", "description": "" },
            { "language_code": "en", "title": "Test Selection", "description": "" }

        ]
    }))
    .expect("Failed to deserialize mock CollectionPostPayload")
}
