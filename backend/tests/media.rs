use axum::http::StatusCode;
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
async fn get_entity_cover_media(db: PgPool) {
    let app = TestRouter::new(db);
    let production_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

    let response = app
        .get(&format!(
            "/media/entity/production/{production_id}/cover?role=gallery"
        ))
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    let data: Option<MediaPayload> = response.into_struct().await;
    assert!(data.is_some());
    let media = data.unwrap();
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
