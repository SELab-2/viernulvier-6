use std::str::FromStr;

use axum::http::StatusCode;
use database::models::article::ArticleStatus;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_api::dto::article::{
    ArticleListPayload, ArticlePayload, ArticlePostPayload, ArticleRelationsPayload,
    ArticleUpdatePayload,
};

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_all_returns_only_published(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].slug, "published-article");
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_one_published_by_slug(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/published-article").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "published-article");
    assert_eq!(data.title.as_deref(), Some("A Published Article"));
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_one_draft_returns_404(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/draft-article").await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_one_archived_returns_404(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/archived-article").await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn get_one_not_found(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/nonexistent-slug").await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_all_cms_returns_all_statuses(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let response = app.get("/articles/cms").await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert_eq!(data.len(), 3);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_all_cms_requires_auth(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/cms").await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_one_cms_by_id(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();
    let app = TestRouter::as_editor(db).await;
    let response = app.get(&format!("/articles/cms/{target_id}")).await;

    assert_eq!(response.status(), StatusCode::OK);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "draft-article");
}

#[sqlx::test]
#[test_log::test]
async fn get_one_cms_not_found(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let response = app.get(&format!("/articles/cms/{}", Uuid::nil())).await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn post_success(db: PgPool) {
    let payload: ArticlePostPayload =
        serde_json::from_value(json!({ "title": "My New Article" })).unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app.post("/articles", &payload).await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "my-new-article");
    assert_eq!(data.title.as_deref(), Some("My New Article"));
    assert_eq!(data.status, ArticleStatus::Draft);
    assert!(!data.id.is_nil());
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn post_duplicate_title_increments_slug(db: PgPool) {
    let payload: ArticlePostPayload =
        serde_json::from_value(json!({ "title": "Published Article" })).unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "published-article-2");
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn put_success(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();

    let update: ArticleUpdatePayload = serde_json::from_value(json!({
        "slug": "updated-draft",
        "status": "draft",
        "title": "Updated Title"
    }))
    .unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "updated-draft");
    assert_eq!(data.title.as_deref(), Some("Updated Title"));
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn put_slug_conflict_returns_409(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();

    let update: ArticleUpdatePayload = serde_json::from_value(json!({
        "slug": "published-article",
        "status": "draft",
        "title": "Conflict Test"
    }))
    .unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn put_same_slug_no_conflict(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();

    let update: ArticleUpdatePayload = serde_json::from_value(json!({
        "slug": "draft-article",
        "status": "draft",
        "title": "Same Slug Is Fine"
    }))
    .unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[sqlx::test]
#[test_log::test]
async fn put_not_found(db: PgPool) {
    let update: ArticleUpdatePayload = serde_json::from_value(json!({
        "slug": "ghost",
        "status": "draft"
    }))
    .unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app
        .put(&format!("/articles/cms/{}", Uuid::nil()), &update)
        .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn delete_success(db: PgPool) {
    let target_id = Uuid::from_str("cccccccc-cccc-cccc-cccc-cccccccccccc").unwrap();

    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .delete(&format!("/articles/cms/{target_id}"))
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app.delete(&format!("/articles/cms/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let verify = app.get(&format!("/articles/cms/{target_id}")).await;
    assert_eq!(verify.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test]
#[test_log::test]
async fn delete_not_found(db: PgPool) {
    let unauth_app = TestRouter::new(db.clone());
    let unauth_response = unauth_app
        .delete(&format!("/articles/cms/{}", Uuid::nil()))
        .await;
    assert_eq!(unauth_response.status(), StatusCode::UNAUTHORIZED);

    let app = TestRouter::as_editor(db).await;
    let response = app.delete(&format!("/articles/cms/{}", Uuid::nil())).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("articles", "productions"))]
#[test_log::test]
async fn relations_crud(db: PgPool) {
    let article_id = Uuid::from_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let production_id = Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap();

    let app = TestRouter::as_editor(db).await;

    let response = app
        .get(&format!("/articles/cms/{article_id}/relations"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert!(data.production_ids.is_empty());

    let relations = json!({
        "production_ids": [production_id],
        "artist_ids": [],
        "location_ids": [],
        "event_ids": []
    });
    let response = app
        .put(&format!("/articles/cms/{article_id}/relations"), &relations)
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert_eq!(data.production_ids.len(), 1);
    assert_eq!(data.production_ids[0], production_id);

    let response = app
        .get(&format!("/articles/cms/{article_id}/relations"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert_eq!(data.production_ids.len(), 1);

    let empty = json!({
        "production_ids": [],
        "artist_ids": [],
        "location_ids": [],
        "event_ids": []
    });
    let response = app
        .put(&format!("/articles/cms/{article_id}/relations"), &empty)
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert!(data.production_ids.is_empty());
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn relations_requires_auth(db: PgPool) {
    let article_id = Uuid::from_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let app = TestRouter::new(db);

    let response = app
        .get(&format!("/articles/cms/{article_id}/relations"))
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
