#![allow(clippy::indexing_slicing)]
use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::facet::EntityFacetResponse;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

const PROD_ID: &str = "11111111-1111-1111-1111-111111111111";

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_tags_empty(db: PgPool) {
    let app = TestRouter::new(db);
    let resp = app.get(&format!("/tags/production/{PROD_ID}")).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let data: Vec<EntityFacetResponse> = resp.into_struct().await;
    assert!(data.is_empty());
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_tags_non_taggable(db: PgPool) {
    let app = TestRouter::new(db);
    let resp = app.get("/tags/location/11111111-1111-1111-1111-111111111111").await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn put_tags_happy_path(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let resp = app.put(
        &format!("/tags/production/{PROD_ID}"),
        json!({ "tag_slugs": ["theatre", "dance"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let data: Vec<EntityFacetResponse> = resp.into_struct().await;
    assert_eq!(data.len(), 1); // both are discipline facet
    assert_eq!(data[0].tags.len(), 2);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn put_tags_deduplicates(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let resp = app.put(
        &format!("/tags/production/{PROD_ID}"),
        json!({ "tag_slugs": ["theatre", "theatre"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let data: Vec<EntityFacetResponse> = resp.into_struct().await;
    assert_eq!(data[0].tags.len(), 1);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn put_tags_unknown_slug(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let resp = app.put(
        &format!("/tags/production/{PROD_ID}"),
        json!({ "tag_slugs": ["nonexistent-slug"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(fixtures("artists"))]
#[test_log::test]
async fn put_tags_inapplicable_facet(db: PgPool) {
    // "format" facet doesn't apply to "artist" — should be 400, not 500
    let app = TestRouter::as_editor(db).await;
    let resp = app.put(
        "/tags/artist/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
        json!({ "tag_slugs": ["workshop"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test]
#[test_log::test]
async fn put_tags_entity_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let fake_id = Uuid::nil();
    let resp = app.put(
        &format!("/tags/production/{fake_id}"),
        json!({ "tag_slugs": ["theatre"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn put_tags_non_taggable(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let resp = app.put(
        "/tags/event/11111111-1111-1111-1111-111111111111",
        json!({ "tag_slugs": ["theatre"] }),
    ).await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}
