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

// ── Auth protection tests ───────────────────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_put_media_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let payload = json!({
        "id": media_id,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "s3_key": "media/production/1001/media/cover.jpg",
        "mime_type": "image/jpeg",
        "source_system": "viernulvier",
        "crops": []
    });

    let response = app.put(&format!("/media/{media_id}"), &payload).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_delete_media_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();

    let response = app.delete(&format!("/media/{media_id}")).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_unlink_media_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();

    let response = app
        .delete(&format!("/media/entity/production/{prod_id}/{media_id}"))
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_set_cover_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();

    let response = app
        .post(
            &format!("/media/entity/production/{prod_id}/{media_id}/set-cover"),
            &json!({}),
        )
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_clear_cover_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .delete(&format!("/media/entity/production/{prod_id}/cover"))
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_cleanup_returns_401(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.post("/media/cleanup", &json!({})).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn unauthenticated_upload_url_returns_401(db: PgPool) {
    let app = TestRouter::new(db);
    let payload = json!({
        "filename": "test.jpg",
        "mime_type": "image/jpeg"
    });

    let response = app.post("/media/upload-url", &payload).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ── Set-cover / Clear-cover logic tests ─────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn set_cover_promotes_gallery_item(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    // 'aaaaaaaa' is the current cover (is_cover_image=true, role=gallery).
    // 'bbbbbbbb' is a poster.
    // First attach a second gallery item, then promote it to cover.
    let attach_payload = json!({
        "s3_key": "media/cms/new-gallery.jpg",
        "mime_type": "image/jpeg",
        "role": "gallery",
        "sort_order": 1,
        "is_cover_image": false
    });

    let attach_res = app
        .post(
            &format!("/media/entity/production/{prod_id}/attach"),
            &attach_payload,
        )
        .await;
    assert_eq!(attach_res.status(), StatusCode::CREATED);
    let new_media: MediaPayload = attach_res.into_struct().await;

    // Promote the new media to cover
    let set_cover_res = app
        .post(
            &format!("/media/entity/production/{prod_id}/{}/set-cover", new_media.id),
            &json!({}),
        )
        .await;
    assert_eq!(set_cover_res.status(), StatusCode::NO_CONTENT);

    // Verify: cover_only should return the new media
    let cover_res = app
        .get(&format!(
            "/media/entity/production/{prod_id}?cover_only=true"
        ))
        .await;
    assert_eq!(cover_res.status(), StatusCode::OK);
    let covers: Vec<MediaPayload> = cover_res.into_struct().await;
    assert_eq!(covers.len(), 1);
    assert_eq!(covers[0].id, new_media.id);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn clear_cover_demotes_to_gallery(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let prod_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    // 'aaaaaaaa' is currently the cover for gallery role
    let clear_res = app
        .delete(&format!("/media/entity/production/{prod_id}/cover"))
        .await;
    assert_eq!(clear_res.status(), StatusCode::NO_CONTENT);

    // Verify: cover_only=true with explicit cover search should give empty or fallback
    let cover_res = app
        .get(&format!(
            "/media/entity/production/{prod_id}?role=gallery&cover_only=true"
        ))
        .await;
    assert_eq!(cover_res.status(), StatusCode::OK);
    let covers: Vec<MediaPayload> = cover_res.into_struct().await;
    // After clearing, there's no explicit cover, but cover_only falls back to first by sort order
    assert_eq!(covers.len(), 1);
}

// ── Update media (PUT) logic test ───────────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn put_media_updates_metadata_preserves_s3_key(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let media_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();

    // First fetch the current media
    let get_res = app.get(&format!("/media/{media_id}")).await;
    assert_eq!(get_res.status(), StatusCode::OK);
    let original: MediaPayload = get_res.into_struct().await;

    // Update alt text
    let mut update_payload = serde_json::to_value(&original).unwrap();
    update_payload["alt_text_nl"] = json!("Updated cover alt text");
    update_payload["credit_nl"] = json!("New credit");

    let put_res = app
        .put(&format!("/media/{media_id}"), &update_payload)
        .await;
    assert_eq!(put_res.status(), StatusCode::OK);
    let updated: MediaPayload = put_res.into_struct().await;

    assert_eq!(updated.alt_text_nl.as_deref(), Some("Updated cover alt text"));
    assert_eq!(updated.credit_nl.as_deref(), Some("New credit"));
    // s3_key should be preserved (not overwritten by the empty string from From<MediaPayload>)
    assert_eq!(updated.s3_key, original.s3_key);
    assert_eq!(updated.id, original.id);
}

// ── Entity type parsing tests ───────────────────────────────────────

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn invalid_entity_type_returns_bad_request(db: PgPool) {
    let app = TestRouter::new(db);
    let entity_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!("/media/entity/invalid_type/{entity_id}"))
        .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(fixtures("productions", "media"))]
#[test_log::test]
async fn blogpost_alias_for_article_entity_type(db: PgPool) {
    let app = TestRouter::new(db);
    // Use a non-existent UUID — we just check it doesn't fail with a bad entity_type error
    let entity_id = Uuid::parse_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();

    let response = app
        .get(&format!("/media/entity/blogpost/{entity_id}"))
        .await;
    // Should return 200 with empty list, not 400
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<MediaPayload> = response.into_struct().await;
    assert!(data.is_empty());
}
