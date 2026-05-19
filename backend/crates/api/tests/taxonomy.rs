#![allow(clippy::indexing_slicing)]
use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use api::dto::facet::{FacetResponse, TagResponse};
use api::dto::tag::TagUsageResponse;

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

#[sqlx::test]
#[test_log::test]
async fn create_tag_success(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app
        .post(
            "/taxonomy/tags",
            json!({
                "facet": "discipline",
                "translations": [
                    { "language_code": "nl", "label": "Nieuwe Discipline" },
                    { "language_code": "en", "label": "New Discipline" }
                ]
            }),
        )
        .await;

    assert_eq!(response.status(), StatusCode::CREATED);
    let data: TagResponse = response.into_struct().await;
    assert_eq!(data.slug, "nieuwe-discipline");
    assert_eq!(data.translations.len(), 2);
    assert!(
        data.translations
            .iter()
            .any(|t| t.language_code == "nl" && t.label == "Nieuwe Discipline")
    );
    assert!(
        data.translations
            .iter()
            .any(|t| t.language_code == "en" && t.label == "New Discipline")
    );
}

#[sqlx::test]
#[test_log::test]
async fn create_tag_duplicate_returns_conflict(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    // "theatre" already exists in discipline
    let response = app
        .post(
            "/taxonomy/tags",
            json!({
                "facet": "discipline",
                "translations": [
                    { "language_code": "nl", "label": "Theatre" },
                    { "language_code": "en", "label": "Theatre" }
                ]
            }),
        )
        .await;

    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[sqlx::test]
#[test_log::test]
async fn update_tag_success(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app
        .patch(
            "/taxonomy/tags/theatre",
            json!({
                "translations": [
                    { "language_code": "nl", "label": "Theater Bijgewerkt" },
                    { "language_code": "en", "label": "Theatre Updated" }
                ]
            }),
        )
        .await;

    assert_eq!(response.status(), StatusCode::NO_CONTENT);
}

#[sqlx::test]
#[test_log::test]
async fn update_tag_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;

    let response = app
        .patch(
            "/taxonomy/tags/nonexistent-slug",
            json!({
                "translations": [
                    { "language_code": "nl", "label": "Foo" },
                    { "language_code": "en", "label": "Foo" }
                ]
            }),
        )
        .await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_tag_unused(db: PgPool) {
    // "language" facet has tags with no productions tagged — safe to delete
    let app = TestRouter::as_editor(db).await;

    // First verify it exists
    let get_resp = app.get("/taxonomy/facets").await;
    let facets: Vec<FacetResponse> = get_resp.into_struct().await;
    let lang_facet = facets.iter().find(|f| f.slug == "language").unwrap();
    let first_slug = lang_facet.tags[0].slug.clone();

    let response = app.delete(&format!("/taxonomy/tags/{first_slug}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn delete_tag_in_use_returns_conflict_with_count(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    const PROD_ID: &str = "11111111-1111-1111-1111-111111111111";

    // Tag the production with "theatre"
    app.put(
        &format!("/tags/production/{PROD_ID}"),
        json!({ "tag_slugs": ["theatre"] }),
    )
    .await;

    let response = app.delete("/taxonomy/tags/theatre").await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
    let data: TagUsageResponse = response.into_struct().await;
    assert_eq!(data.usage_count, 1);
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn delete_tag_in_use_with_force_removes_tag_and_taggings(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    const PROD_ID: &str = "11111111-1111-1111-1111-111111111111";

    // Tag the production with "theatre"
    app.put(
        &format!("/tags/production/{PROD_ID}"),
        json!({ "tag_slugs": ["theatre"] }),
    )
    .await;

    let response = app.delete("/taxonomy/tags/theatre?force=true").await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Tag should be gone from facets
    let get_resp = app.get("/taxonomy/facets").await;
    let facets: Vec<FacetResponse> = get_resp.into_struct().await;
    let discipline = facets.iter().find(|f| f.slug == "discipline").unwrap();
    assert!(!discipline.tags.iter().any(|t| t.slug == "theatre"));
}

#[sqlx::test]
#[test_log::test]
async fn delete_tag_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let response = app.delete("/taxonomy/tags/nonexistent-slug").await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn create_tag_requires_auth(db: PgPool) {
    let app = TestRouter::new(db); // no login
    let response = app
        .post(
            "/taxonomy/tags",
            json!({ "facet": "discipline", "translations": [] }),
        )
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
