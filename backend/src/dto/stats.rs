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
    pub media_count: i64,
}

impl StatsPayload {
    pub async fn collect(db: &Database) -> Result<Self, AppError> {
        let (
            (oldest_event, newest_event),
            event_count,
            production_count,
            location_count,
            article_count,
            artist_count,
            collection_count,
            media_count,
        ) = tokio::try_join!(
            async { db.events().bounds().await },
            async { db.events().count().await },
            async { db.productions().count().await },
            async { db.locations().count().await },
            async { db.articles().count_published().await },
            async { db.artists().count().await },
            async { db.collections().count().await },
            async { db.media().count().await },
        )?;
        Ok(Self {
            oldest_event,
            newest_event,
            event_count,
            production_count,
            location_count,
            article_count,
            artist_count,
            collection_count,
            media_count,
        })
    }
}
