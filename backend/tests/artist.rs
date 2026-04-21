#![allow(clippy::indexing_slicing)]
use std::str::FromStr;

use axum::http::StatusCode;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::dto::{artist::ArtistPayload, production::ProductionPayload};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("artists"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/artists").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ArtistPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);
}

#[sqlx::test(fixtures("artists"))]
#[test_log::test]
async fn get_one_success(db: PgPool) {
    let app = TestRouter::new(db);
    let target_id = Uuid::from_str("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1").unwrap();

    let response = app.get(&format!("/artists/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ArtistPayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "test-artist");
    assert_eq!(data.name, "Test Artist");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get(&format!("/artists/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("artists", "productions", "production_artists"))]
#[test_log::test]
async fn get_productions_by_artist(db: PgPool) {
    let app = TestRouter::new(db);
    let artist_id = Uuid::from_str("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1").unwrap();

    let response = app.get(&format!("/artists/{artist_id}/productions")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.len(), 2);
    assert_eq!(data[0].id, Uuid::from_str("22222222-2222-2222-2222-222222222222").unwrap());
    assert_eq!(data[1].id, Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap());
}

#[sqlx::test(fixtures("artists", "productions", "production_artists"))]
#[test_log::test]
async fn get_productions_empty_for_artist_without_links(db: PgPool) {
    let app = TestRouter::new(db);
    let artist_id = Uuid::from_str("b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2").unwrap();

    let response = app.get(&format!("/artists/{artist_id}/productions")).await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ProductionPayload> = response.into_struct().await;
    assert!(data.is_empty());
}

#[sqlx::test]
#[test_log::test]
async fn get_productions_not_found(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app
        .get(&format!("/artists/{}/productions", Uuid::nil()))
        .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
