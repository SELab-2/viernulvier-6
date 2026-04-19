#![allow(clippy::indexing_slicing)]
use axum::http::StatusCode;
use sqlx::PgPool;
use viernulvier_archive::dto::artist::ArtistPayload;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("artists", "media", "entity_media_artist_cover"))]
#[test_log::test]
async fn get_all_artists_returns_cover_image_urls(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/artists").await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArtistPayload> = response.into_struct().await;
    let with_cover = data.iter().find(|a| a.cover_image_url.is_some());
    assert!(
        with_cover.is_some(),
        "at least one artist should have a resolved cover URL"
    );
}

#[sqlx::test(fixtures("artists"))]
#[test_log::test]
async fn get_all_artists_without_cover_returns_null(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/artists").await;
    let data: Vec<ArtistPayload> = response.into_struct().await;
    for a in &data {
        assert!(a.cover_image_url.is_none());
    }
}
