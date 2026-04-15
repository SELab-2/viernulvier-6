use std::str::FromStr;

use axum::http::StatusCode;
use chrono::NaiveDate;
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
    assert!(data.len() >= 1);
    assert!(data.iter().any(|a| a.slug == "published-article"));
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
    assert!(data.len() >= 3);
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
async fn post_duplicate_title_returns_conflict(db: PgPool) {
    let payload: ArticlePostPayload =
        serde_json::from_value(json!({ "title": "Published Article" })).unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
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

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_all_filters_by_subject_dates(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app
        .get("/articles?subject_start=2026-01-01&subject_end=2026-06-30")
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert!(data.iter().any(|a| a.slug == "published-article"));

    let response = app
        .get("/articles?subject_start=2027-01-01&subject_end=2027-12-31")
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert!(!data.iter().any(|a| a.slug == "published-article"));
}

#[sqlx::test(fixtures("articles", "article_taggings"))]
#[test_log::test]
async fn get_all_filters_by_tag(db: PgPool) {
    let app = TestRouter::new(db);

    let response = app.get("/articles?tag_slug=theatre").await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].slug, "published-article");

    let response = app.get("/articles?tag_slug=dance").await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert!(data.is_empty());
}

#[sqlx::test(fixtures("articles", "productions"))]
#[test_log::test]
async fn get_all_filters_by_related_production(db: PgPool) {
    let article_id = Uuid::from_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let production_id = Uuid::from_str("11111111-1111-1111-1111-111111111111").unwrap();

    let editor = TestRouter::as_editor(db.clone()).await;
    let relations = json!({
        "production_ids": [production_id],
        "artist_ids": [],
        "location_ids": [],
        "event_ids": []
    });
    let response = editor
        .put(&format!("/articles/cms/{article_id}/relations"), &relations)
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let app = TestRouter::new(db);
    let response = app
        .get(&format!(
            "/articles?related_entity_id={production_id}&related_entity_type=production"
        ))
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].slug, "published-article");

    let other_id = Uuid::from_str("22222222-2222-2222-2222-222222222222").unwrap();
    let response = app
        .get(&format!(
            "/articles?related_entity_id={other_id}&related_entity_type=production"
        ))
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert!(data.is_empty());
}

#[sqlx::test]
#[test_log::test]
async fn post_no_title_uses_fallback_slug(db: PgPool) {
    let payload: ArticlePostPayload = serde_json::from_value(json!({})).unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "article");
    assert!(data.title.is_none());
}

#[sqlx::test]
#[test_log::test]
async fn post_empty_title_uses_fallback_slug(db: PgPool) {
    let payload: ArticlePostPayload = serde_json::from_value(json!({ "title": "" })).unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "article");
}

#[sqlx::test]
#[test_log::test]
async fn post_defaults_are_correct(db: PgPool) {
    let payload: ArticlePostPayload =
        serde_json::from_value(json!({ "title": "Defaults Test" })).unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.status, ArticleStatus::Draft);
    assert!(data.content.is_none());
    assert!(data.subject_period_start.is_none());
    assert!(data.subject_period_end.is_none());
    assert!(!data.id.is_nil());

    let diff = (data.updated_at - data.created_at).num_seconds().abs();
    assert!(diff < 2);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn put_updates_all_fields(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();

    let update: ArticleUpdatePayload = serde_json::from_value(json!({
        "slug": "fully-updated",
        "status": "published",
        "title": "Full Update",
        "content": {"type": "doc", "content": [{"type": "paragraph"}]},
        "subject_period_start": "2026-04-01",
        "subject_period_end": "2026-09-30"
    }))
    .unwrap();

    let app = TestRouter::as_editor(db).await;
    let response = app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.id, target_id);
    assert_eq!(data.slug, "fully-updated");
    assert_eq!(data.status, ArticleStatus::Published);
    assert_eq!(data.title.as_deref(), Some("Full Update"));
    assert!(data.content.is_some());
    assert_eq!(
        data.subject_period_start,
        Some(NaiveDate::from_ymd_opt(2026, 4, 1).unwrap())
    );
    assert_eq!(
        data.subject_period_end,
        Some(NaiveDate::from_ymd_opt(2026, 9, 30).unwrap())
    );

    assert_eq!(
        data.created_at.date_naive(),
        NaiveDate::from_ymd_opt(2026, 3, 2).unwrap()
    );

    let now = chrono::Utc::now();
    let age = (now - data.updated_at).num_seconds();
    assert!(age < 10);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn user_role_rejected_from_cms(db: PgPool) {
    let target_id = Uuid::from_str("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").unwrap();
    let app = TestRouter::as_user(db).await;

    let response = app.get("/articles/cms").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = app.get(&format!("/articles/cms/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let payload = json!({ "title": "Sneaky" });
    let response = app.post("/articles", &payload).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let update = json!({ "slug": "hacked", "status": "draft", "title": "Nope" });
    let response = app
        .put(&format!("/articles/cms/{target_id}"), &update)
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = app.delete(&format!("/articles/cms/{target_id}")).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = app
        .get(&format!("/articles/cms/{target_id}/relations"))
        .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(fixtures("articles", "artists", "locations"))]
#[test_log::test]
async fn relations_with_artist_and_location(db: PgPool) {
    let article_id = Uuid::from_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let artist_id = Uuid::from_str("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1").unwrap();
    let location_id = Uuid::from_str("10000000-0000-0000-0000-000000000001").unwrap();

    let app = TestRouter::as_editor(db).await;

    let relations = json!({
        "production_ids": [],
        "artist_ids": [artist_id],
        "location_ids": [location_id],
        "event_ids": []
    });
    let response = app
        .put(&format!("/articles/cms/{article_id}/relations"), &relations)
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert_eq!(data.artist_ids, vec![artist_id]);
    assert_eq!(data.location_ids, vec![location_id]);
    assert!(data.production_ids.is_empty());
    assert!(data.event_ids.is_empty());

    let response = app
        .get(&format!("/articles/cms/{article_id}/relations"))
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data: ArticleRelationsPayload = response.into_struct().await;
    assert_eq!(data.artist_ids.len(), 1);
    assert_eq!(data.location_ids.len(), 1);

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
    assert!(data.artist_ids.is_empty());
    assert!(data.location_ids.is_empty());
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_all_cms_returns_ordered_by_updated_at(db: PgPool) {
    let app = TestRouter::as_editor(db).await;
    let response = app.get("/articles/cms").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ArticleListPayload> = response.into_struct().await;
    assert!(data.len() >= 3);

    let statuses: Vec<_> = data.iter().map(|a| &a.status).collect();
    assert!(statuses.contains(&&ArticleStatus::Published));
    assert!(statuses.contains(&&ArticleStatus::Draft));
    assert!(statuses.contains(&&ArticleStatus::Archived));
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_one_published_returns_all_fields(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/articles/published-article").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: ArticlePayload = response.into_struct().await;
    assert_eq!(data.slug, "published-article");
    assert_eq!(data.status, ArticleStatus::Published);
    assert_eq!(data.title.as_deref(), Some("A Published Article"));
    assert!(data.content.is_some());
    assert_eq!(
        data.subject_period_start,
        Some(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap())
    );
    assert_eq!(
        data.subject_period_end,
        Some(NaiveDate::from_ymd_opt(2026, 6, 30).unwrap())
    );
    assert!(!data.id.is_nil());
}
