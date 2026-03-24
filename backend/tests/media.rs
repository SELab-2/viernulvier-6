use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::media::MediaPayload;

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
    assert_eq!(media.alt_text.as_deref(), Some("Cover image"));
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
        "alt_text": "Attached from CMS"
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
    assert_eq!(attached.alt_text.as_deref(), Some("Attached from CMS"));

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
