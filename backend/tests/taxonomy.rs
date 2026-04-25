#![allow(clippy::indexing_slicing)]
use axum::http::StatusCode;
use sqlx::PgPool;
use viernulvier_archive::dto::facet::FacetResponse;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test]
#[test_log::test]
async fn get_all(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/taxonomy/facets").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<FacetResponse> = response.into_struct().await;
    assert_eq!(data.len(), 6);

    assert_eq!(data[0].slug, "discipline");
    assert_eq!(data[1].slug, "format");
    assert_eq!(data[2].slug, "theme");
    assert_eq!(data[3].slug, "audience");
    assert_eq!(data[4].slug, "accessibility");
    assert_eq!(data[5].slug, "language");

    assert_eq!(data[0].tags.len(), 14);
    assert_eq!(data[1].tags.len(), 11);
    assert_eq!(data[2].tags.len(), 5);
    assert_eq!(data[3].tags.len(), 5);
    assert_eq!(data[4].tags.len(), 5);
    assert_eq!(data[5].tags.len(), 3);

    assert_eq!(data[0].tags[0].slug, "theatre");
    assert_eq!(data[0].tags[6].slug, "installation");
}

#[sqlx::test]
#[test_log::test]
async fn get_filtered_by_production(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/taxonomy/facets?entity_type=production").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<FacetResponse> = response.into_struct().await;
    assert_eq!(data.len(), 6);
    assert_eq!(data[0].slug, "discipline");
    assert_eq!(data[3].slug, "audience");
    assert_eq!(data[4].slug, "accessibility");
    assert_eq!(data[5].slug, "language");
}

#[sqlx::test]
#[test_log::test]
async fn get_filtered_by_artist(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/taxonomy/facets?entity_type=artist").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<FacetResponse> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].slug, "discipline");
    assert_eq!(data[0].tags.len(), 14);
}

#[sqlx::test]
#[test_log::test]
async fn get_filtered_by_unknown_entity_type(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/taxonomy/facets?entity_type=nonexistent").await;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
