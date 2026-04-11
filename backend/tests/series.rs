use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::series::{SeriesPayload, SeriesPostPayload, SeriesProductionsPayload};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

// ── GET /series ─────────────────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/series").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<SeriesPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);

    for series in &data {
        assert!(!series.translations.is_empty());
        assert_eq!(series.translations.len(), 2);
        assert!(!series.production_ids.is_empty());
        assert!(series.period_start.is_some());
        assert!(series.period_end.is_some());
    }
}

// ── GET /series/{slug} ──────────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/series/palmarium").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: SeriesPayload = response.into_struct().await;
    assert_eq!(data.slug, "palmarium");
    assert_eq!(data.production_ids.len(), 2);

    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    assert_eq!(nl.name, "Palmarium");
    assert_eq!(nl.subtitle, "Concertreeks in de plantentuin");

    assert!(data.period_start.is_some());
    assert!(data.period_end.is_some());
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/series/nonexistent").await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ── GET /productions/{id}/series ────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn get_series_for_production(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = "11111111-1111-1111-1111-111111111111";

    let response = app
        .get(&format!("/productions/{production_id}/series"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<SeriesPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);

    let mut slugs: Vec<&str> = data.iter().map(|s| s.slug.as_str()).collect();
    slugs.sort();
    assert_eq!(slugs, vec!["fresh-juice", "palmarium"]);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn get_series_for_production_empty(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app
        .get(&format!("/productions/{}/series", Uuid::nil()))
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<SeriesPayload> = response.into_struct().await;
    assert!(data.is_empty());
}

// ── POST /series ────────────────────────────────────────────────────

#[sqlx::test]
#[test_log::test]
async fn post_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let payload = mock_post_payload();

    let unauthenticated_response = unauthenticated_app.post("/series", &payload).await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.post("/series", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: SeriesPayload = response.into_struct().await;
    assert_eq!(data.slug, "test-reeks");
    assert!(data.production_ids.is_empty());
    assert!(data.period_start.is_none());
    assert!(data.period_end.is_none());
    assert!(!data.id.is_nil());

    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    assert_eq!(nl.name, "Test Reeks");
    assert_eq!(nl.subtitle, "Ondertitel");
}

// ── PUT /series ─────────────────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());

    let get_response = unauthenticated_app.get("/series/palmarium").await;
    let original: SeriesPayload = get_response.into_struct().await;

    let app = TestRouter::as_editor(db).await;

    let update_payload: SeriesPayload = serde_json::from_value(json!({
        "id": original.id,
        "slug": "palmarium-updated",
        "translations": [
            { "language_code": "nl", "name": "Palmarium (bijgewerkt)", "subtitle": "", "description": "" },
            { "language_code": "en", "name": "Palmarium (updated)", "subtitle": "", "description": "" }
        ],
        "production_ids": [],
        "period_start": null,
        "period_end": null,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize SeriesPayload");

    let unauthenticated_response = unauthenticated_app.put("/series", &update_payload).await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.put("/series", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: SeriesPayload = response.into_struct().await;
    assert_eq!(data.slug, "palmarium-updated");
    let nl = data
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .expect("Dutch translation not found");
    assert_eq!(nl.name, "Palmarium (bijgewerkt)");

    assert_eq!(data.production_ids.len(), 2);
    assert!(data.period_start.is_some());
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let missing: SeriesPayload = serde_json::from_value(json!({
        "id": Uuid::nil(),
        "slug": "missing",
        "translations": [
            { "language_code": "nl", "name": "Missing", "subtitle": "", "description": "" }
        ],
        "production_ids": [],
        "period_start": null,
        "period_end": null,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize SeriesPayload");

    let response = app.put("/series", &missing).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ── DELETE /series/{slug} ───────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let unauthenticated_response = unauthenticated_app.delete("/series/palmarium").await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;

    let response = app.delete("/series/palmarium").await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get("/series/palmarium").await;
    assert_eq!(verify_res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let response = app.delete("/series/nonexistent").await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ── POST /series/{slug}/productions ─────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn add_productions_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let payload: SeriesProductionsPayload = serde_json::from_value(json!({
        "production_ids": ["22222222-2222-2222-2222-222222222222"]
    }))
    .expect("Failed to deserialize");

    let unauthenticated_response = unauthenticated_app
        .post("/series/fresh-juice/productions", &payload)
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app.post("/series/fresh-juice/productions", &payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: SeriesPayload = response.into_struct().await;
    assert_eq!(data.production_ids.len(), 2);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn add_productions_not_found_series(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload: SeriesProductionsPayload = serde_json::from_value(json!({
        "production_ids": ["11111111-1111-1111-1111-111111111111"]
    }))
    .expect("Failed to deserialize");

    let response = app.post("/series/nonexistent/productions", &payload).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn add_productions_invalid_production_id(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload: SeriesProductionsPayload = serde_json::from_value(json!({
        "production_ids": ["00000000-0000-0000-0000-000000000000"]
    }))
    .expect("Failed to deserialize");

    let response = app.post("/series/palmarium/productions", &payload).await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ── DELETE /series/{slug}/productions/{production_id} ───────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn remove_production_success(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;
    let production_id = "11111111-1111-1111-1111-111111111111";

    let unauthenticated_response = unauthenticated_app
        .delete(&format!("/series/palmarium/productions/{production_id}"))
        .await;
    assert_eq!(unauthenticated_response.status(), StatusCode::UNAUTHORIZED);

    let response = app
        .delete(&format!("/series/palmarium/productions/{production_id}"))
        .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify_res = app.get("/series/palmarium").await;
    let data: SeriesPayload = verify_res.into_struct().await;
    assert_eq!(data.production_ids.len(), 1);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn remove_production_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app
        .delete(&format!("/series/palmarium/productions/{}", Uuid::nil()))
        .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ── Derived period ──────────────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn derived_period_from_events(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/series/palmarium").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: SeriesPayload = response.into_struct().await;
    let start = data.period_start.expect("period_start should be set");
    let end = data.period_end.expect("period_end should be set");

    assert_eq!(start.date_naive().to_string(), "2026-05-01");
    assert_eq!(end.date_naive().to_string(), "2026-06-01");
    assert!(start < end);
}

#[sqlx::test]
#[test_log::test]
async fn empty_series_has_null_period(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload = mock_post_payload();
    let response = app.post("/series", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: SeriesPayload = response.into_struct().await;
    assert!(data.period_start.is_none());
    assert!(data.period_end.is_none());
}

// ── Edge cases ──────────────────────────────────────────────────

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn post_duplicate_slug(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload: SeriesPostPayload = serde_json::from_value(json!({
        "slug": "palmarium",
        "translations": [
            { "language_code": "nl", "name": "Dup", "subtitle": "", "description": "" }
        ]
    }))
    .expect("Failed to deserialize");

    let response = app.post("/series", &payload).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn put_slug_conflict(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let get_response = unauthenticated_app.get("/series/fresh-juice").await;
    let original: SeriesPayload = get_response.into_struct().await;

    let update_payload: SeriesPayload = serde_json::from_value(json!({
        "id": original.id,
        "slug": "palmarium",
        "translations": [
            { "language_code": "nl", "name": "Stolen slug", "subtitle": "", "description": "" }
        ],
        "production_ids": [],
        "period_start": null,
        "period_end": null,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize");

    let response = app.put("/series", &update_payload).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn put_same_slug_no_conflict(db: PgPool) {
    let unauthenticated_app = TestRouter::new(db.clone());
    let app = TestRouter::as_editor(db).await;

    let get_response = unauthenticated_app.get("/series/palmarium").await;
    let original: SeriesPayload = get_response.into_struct().await;

    let update_payload: SeriesPayload = serde_json::from_value(json!({
        "id": original.id,
        "slug": "palmarium",
        "translations": [
            { "language_code": "nl", "name": "Updated name", "subtitle": "", "description": "" },
            { "language_code": "en", "name": "Updated name EN", "subtitle": "", "description": "" }
        ],
        "production_ids": [],
        "period_start": null,
        "period_end": null,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z"
    }))
    .expect("Failed to deserialize");

    let response = app.put("/series", &update_payload).await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn add_productions_idempotent(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let payload: SeriesProductionsPayload = serde_json::from_value(json!({
        "production_ids": ["11111111-1111-1111-1111-111111111111"]
    }))
    .expect("Failed to deserialize");

    let response = app.post("/series/palmarium/productions", &payload).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: SeriesPayload = response.into_struct().await;
    assert_eq!(data.production_ids.len(), 2);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn remove_production_nonexistent_series(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app
        .delete("/series/nonexistent/productions/11111111-1111-1111-1111-111111111111")
        .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("events", "series"))]
#[test_log::test]
async fn delete_series_cascades_join_rows(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let production_id = "11111111-1111-1111-1111-111111111111";

    let before = app
        .get(&format!("/productions/{production_id}/series"))
        .await;
    let before_data: Vec<SeriesPayload> = before.into_struct().await;
    assert_eq!(before_data.len(), 2);

    let response = app.delete("/series/palmarium").await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let after = app
        .get(&format!("/productions/{production_id}/series"))
        .await;
    let after_data: Vec<SeriesPayload> = after.into_struct().await;
    assert_eq!(after_data.len(), 1);
    assert_eq!(after_data[0].slug, "fresh-juice");
}

// ── Helpers ─────────────────────────────────────────────────────────

fn mock_post_payload() -> SeriesPostPayload {
    serde_json::from_value(json!({
        "slug": "test-reeks",
        "translations": [
            { "language_code": "nl", "name": "Test Reeks", "subtitle": "Ondertitel", "description": "" },
            { "language_code": "en", "name": "Test Series", "subtitle": "Subtitle", "description": "" }
        ]
    }))
    .expect("Failed to deserialize mock SeriesPostPayload")
}
