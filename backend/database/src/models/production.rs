use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Production {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub slug: String,

    title_nl: String,
    title_en: String,
    supertitle_nl: String,
    supertitle_en: String,
    artist_nl: String,
    artist_en: String,

    minimum_age: u8,
    maximum_age: u8,

    // overall run of the production (not individual event times)
    started_at: DateTime<Utc>,
    ended_at: DateTime<Utc>,

    // 'live', 'online', 'mixed', etc
    attendence_mode: String,
    vendor_id: String,
}
