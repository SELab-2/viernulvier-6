use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "EventCreate")]
#[ormlite(table = "events")]
pub struct Event {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,      // can we throw this out?
    pub uitdatabank_id: Option<String>,     // can we throw this out?
    pub max_tickets_per_order: Option<i32>, // can we throw this out?

    pub production_id: Uuid,
    pub status: String, // mostly irrelevant since the show already happened, but status like
    // 'cancelled' might be worthwhile to keep. Could also be modelled as a bool. or drop entirely.
    pub hall_id: Option<Uuid>,
}
