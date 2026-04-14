use chrono::{DateTime, Utc};
use database::Database;
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Debug, Serialize, ToSchema)]
pub struct StatsPayload {
    pub oldest_event: Option<DateTime<Utc>>,
    pub newest_event: Option<DateTime<Utc>>,
    pub event_count: i64,
    pub production_count: i64,
    pub location_count: i64,
    pub article_count: i64,
    pub artist_count: i64,
    pub collection_count: i64,
}

impl StatsPayload {
    pub async fn collect(db: &Database) -> Result<Self, AppError> {
        let db_events_bounds = db.clone();
        let db_events_count = db.clone();
        let db_productions = db.clone();
        let db_locations = db.clone();
        let db_articles = db.clone();
        let db_artists = db.clone();
        let db_collections = db.clone();

        let (
            event_bounds,
            event_count,
            production_count,
            location_count,
            article_count,
            artist_count,
            collection_count,
        ) = tokio::try_join!(
            async move { db_events_bounds.events().bounds().await },
            async move { db_events_count.events().count().await },
            async move { db_productions.productions().count().await },
            async move { db_locations.locations().count().await },
            async move { db_articles.articles().count_published().await },
            async move { db_artists.artists().count().await },
            async move { db_collections.collections().count().await },
        )?;
        let (oldest_event, newest_event) = event_bounds;

        Ok(Self {
            oldest_event,
            newest_event,
            event_count,
            production_count,
            location_count,
            article_count,
            artist_count,
            collection_count,
        })
    }
}
