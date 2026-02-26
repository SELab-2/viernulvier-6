use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Event {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub vendor_id: String,
    pub box_office_id: String,      // can we throw this out?
    pub uitdatabank_id: String,     // can we throw this out?
    pub max_tickets_per_order: i32, // can we throw this out?

    pub production_id: Uuid,
    pub status: String, // mostly irrelevant since the show already happened, but status like
    // 'cancelled' might be worthwhile to keep. Could also be modelled as a bool. or drop entirely.
    pub hall: String,
}
