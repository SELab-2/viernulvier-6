use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::{media::MediaPayload, paginated::PaginatedResponse};

use crate::common::into_struct::IntoStruct;
use crate::common::router::TestRouter;

mod common;

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn get_entity_media_with_role_filter(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}?role=poster"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<MediaPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].gallery_type.as_deref(), Some("poster"));
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn get_entity_cover_media_via_filter(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}?role=gallery&cover_only=true"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<MediaPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    let media = &data[0];
    assert_eq!(media.alt_text_nl.as_deref(), Some("Cover image"));
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn get_entity_media_with_crops(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}?role=gallery&include_crops=true"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<MediaPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].crops.len(), 1);
    assert_eq!(data[0].crops[0].crop_name.as_deref(), Some("square"));
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn invalid_role_returns_bad_request(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}?role=not-valid"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn get_entity_media_respects_pagination(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}?limit=1&offset=0"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<MediaPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn attach_media_transactional_success(db: PgPool) {
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    let payload = json!({
        "s3_key": "media/cms/test-attach.jpg",
        "mime_type": "image/jpeg",
        "role": "gallery",
        "sort_order": 0,
        "is_cover_image": true,
        "alt_text_nl": "Attached from CMS"
    });

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .post(
            &format!("/media/entity/production/{production_id}/attach"),
            &payload,
        )
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app
        .post(
            &format!("/media/entity/production/{production_id}/attach"),
            &payload,
        )
        .await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let attached: MediaPayload = response.into_struct().await;
    assert_eq!(attached.alt_text_nl.as_deref(), Some("Attached from CMS"));

    let list_response = app
        .get(&format!(
            "/media/entity/production/{production_id}?role=gallery&cover_only=true"
        ))
        .await;
    assert_eq!(list_response.status(), StatusCode::OK);
    let listed: Vec<MediaPayload> = list_response.into_struct().await;
    assert!(!listed.is_empty());
    assert!(listed.iter().any(|m| m.id == attached.id));
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn delete_media_cascades_properly(db: PgPool) {
    let app = TestRouter::as_editor(db.clone()).await;
    // We know 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' exists in fixtures/media.sql
    // and has a variant 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let variant_id = Uuid::parse_str("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee").unwrap();

    // 1. Verify it exists
    let response = app.get(&format!("/media/{media_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    // 2. Delete it
    let response = app.delete(&format!("/media/{media_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // 3. Verify it is gone
    let response = app.get(&format!("/media/{media_id}")).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // 4. Verify variant is gone from DB
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM media_variant WHERE id = $1")
        .bind(variant_id)
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(count, 0, "Variant should be manually cascaded away");
}

// ── GET /media ───────────────────────────────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn list_media_returns_all_items(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    assert_eq!(body.data.len(), 2);
    assert!(body.next_cursor.is_none());
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn list_media_sort_recent_returns_newest_first(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media?sort=recent").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    assert_eq!(body.data.len(), 2);
    // bbbbbbbb > aaaaaaaa lexicographically, so id DESC puts bbbbbbbb first
    assert_eq!(
        body.data[0].id,
        Uuid::parse_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap()
    );
    assert_eq!(
        body.data[1].id,
        Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap()
    );
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn list_media_sort_oldest_returns_oldest_first(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media?sort=oldest").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    assert_eq!(body.data.len(), 2);
    // aaaaaaaa < bbbbbbbb lexicographically, so id ASC puts aaaaaaaa first
    assert_eq!(
        body.data[0].id,
        Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap()
    );
    assert_eq!(
        body.data[1].id,
        Uuid::parse_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap()
    );
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn search_media_by_query_returns_matching_items(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media?q=cover").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    assert_eq!(body.data.len(), 1);
    assert_eq!(
        body.data[0].id,
        Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap()
    );
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn search_media_with_date_sort_still_filters_by_query(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media?q=cover&sort=recent").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    // Text filter is applied even on id-based sort path
    assert_eq!(body.data.len(), 1);
    assert_eq!(
        body.data[0].id,
        Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap()
    );
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn search_media_no_match_returns_empty(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/media?q=nonexistentxyz").await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: PaginatedResponse<MediaPayload> = response.into_struct().await;
    assert!(body.data.is_empty());
    assert!(body.next_cursor.is_none());
}

// ── cleanup_orphans ───────────────────────────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn cleanup_orphans(db: PgPool) {
    let app = TestRouter::as_editor(db.clone()).await;
    // Both 'aaaaaaaa' and 'bbbbbbbb' are currently linked to the production in the fixture.

    // Unlink 'aaaaaaaa' from production
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let unlink_res = app
        .delete(&format!("/media/entity/production/{prod_id}/{media_id}"))
        .await;
    assert_eq!(unlink_res.status(), StatusCode::NO_CONTENT);

    // Now trigger cleanup
    let cleanup_res = app.post("/media/cleanup", &json!({})).await;
    assert_eq!(cleanup_res.status(), StatusCode::OK);

    let cleanup_data: serde_json::Value = cleanup_res.into_struct().await;
    assert!(cleanup_data["deleted_count"].as_i64().unwrap() > 0);

    // 'aaaaaaaa' should be gone because it became an orphan
    let response = app.get(&format!("/media/{media_id}")).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
