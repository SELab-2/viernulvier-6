//! Integration tests for `GET /stats`.

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
    artist_count: i64,
    collection_count: i64,
}

fn utc(s: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(s)
        .expect("valid RFC3339")
        .with_timezone(&Utc)
}

#[sqlx::test(fixtures("stats"))]
#[test_log::test]
async fn get_stats_matches_fixture(db: PgPool) {
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

    let body: StatsBody = response.into_struct().await;
    let expected = StatsBody {
        oldest_event: Some(utc("2026-04-10T18:00:00Z")),
        newest_event: Some(utc("2026-07-15T17:00:00Z")),
        event_count: 3,
        production_count: 2,
        location_count: 4,
        // One published article seeded in the stats fixture, plus one from the
        // `seed_article_kleurenstudies` migration.
        article_count: 2,
        artist_count: 2,
        collection_count: 3,
    };
    assert_eq!(body, expected);
}

#[sqlx::test]
#[test_log::test]
async fn get_stats_empty_database(db: PgPool) {
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

    let body: StatsBody = response.into_struct().await;
    let expected = StatsBody {
        oldest_event: None,
        newest_event: None,
        event_count: 0,
        production_count: 0,
        location_count: 0,
        // Migrations seed one published article.
        article_count: 1,
        artist_count: 0,
        collection_count: 0,
    };
    assert_eq!(body, expected);
}
