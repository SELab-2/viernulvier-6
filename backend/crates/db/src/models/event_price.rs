use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "EventPriceCreate")]
#[ormlite(table = "event_prices")]
pub struct EventPrice {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub event_id: Uuid,
    pub price_id: Uuid,
    pub rank_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub available: i32,
    pub amount_cents: i32,
    pub box_office_id: Option<String>,
    pub contingent_id: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
}
