//! Integration tests for `GET /stats` (see `PLAN_STATS_ENDPOINT.md`).

use axum::http::{StatusCode, header};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::PgPool;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

const PUBLIC_CACHE_HEADER: &str = "public, max-age=3600, stale-while-revalidate=86400";

#[derive(Debug, Deserialize, PartialEq)]
struct StatsBody {
    oldest_event: Option<DateTime<Utc>>,
    newest_event: Option<DateTime<Utc>>,
    event_count: i64,
    production_count: i64,
    location_count: i64,
    article_count: i64,
}

async fn expected_stats_from_db(db: &PgPool) -> StatsBody {
    let (oldest_event, newest_event) = sqlx::query_as::<_, (Option<DateTime<Utc>>, Option<DateTime<Utc>>)>(
        "SELECT MIN(starts_at), MAX(starts_at) FROM events",
    )
    .fetch_one(db)
    .await
    .unwrap();

    let event_count: i64 = sqlx::query_scalar("SELECT COUNT(*)::bigint FROM events")
        .fetch_one(db)
        .await
        .unwrap();

    let production_count: i64 = sqlx::query_scalar("SELECT COUNT(*)::bigint FROM productions")
        .fetch_one(db)
        .await
        .unwrap();

    let location_count: i64 = sqlx::query_scalar("SELECT COUNT(*)::bigint FROM locations")
        .fetch_one(db)
        .await
        .unwrap();

    let article_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::bigint FROM articles WHERE status = 'published'")
            .fetch_one(db)
            .await
            .unwrap();

    StatsBody {
        oldest_event,
        newest_event,
        event_count,
        production_count,
        location_count,
        article_count,
    }
}

#[sqlx::test(fixtures("events", "locations", "articles"))]
#[test_log::test]
async fn get_stats_returns_ok(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);
    let _: StatsBody = response.into_struct().await;
}

#[sqlx::test(fixtures("events", "locations", "articles"))]
#[test_log::test]
async fn get_stats_counts(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: StatsBody = response.into_struct().await;
    let expected = expected_stats_from_db(app.db()).await;
    assert_eq!(body, expected);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn get_stats_event_bounds(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: StatsBody = response.into_struct().await;
    let expected = expected_stats_from_db(app.db()).await;
    assert_eq!(body.oldest_event, expected.oldest_event);
    assert_eq!(body.newest_event, expected.newest_event);
    assert_eq!(body.event_count, expected.event_count);
}

#[sqlx::test(fixtures("articles"))]
#[test_log::test]
async fn get_stats_published_articles_only(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: StatsBody = response.into_struct().await;
    let pool = app.db();

    let published: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::bigint FROM articles WHERE status = 'published'")
            .fetch_one(pool)
            .await
            .unwrap();

    assert_eq!(body.article_count, published);

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*)::bigint FROM articles")
        .fetch_one(pool)
        .await
        .unwrap();
    assert!(
        total > published,
        "fixture should include non-published rows when total > published count"
    );
}

#[sqlx::test]
#[test_log::test]
async fn get_stats_empty_database(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: StatsBody = response.into_struct().await;
    let expected = expected_stats_from_db(app.db()).await;
    assert_eq!(body, expected);
}

#[sqlx::test(fixtures("events"))]
#[test_log::test]
async fn get_stats_has_cache_headers(db: PgPool) {
    let app = TestRouter::new(db);
    let response = app.get("/stats").await;
    assert_eq!(response.status(), StatusCode::OK);

    let cache = response
        .headers()
        .get(header::CACHE_CONTROL)
        .expect("Cache-Control header")
        .to_str()
        .expect("Cache-Control utf-8");
    assert_eq!(cache, PUBLIC_CACHE_HEADER);
}
