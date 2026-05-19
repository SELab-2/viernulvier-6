use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "PriceCreate")]
#[ormlite(table = "prices")]
pub struct Price {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub price_type: String,
    pub visibility: String,
    pub code: Option<String>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub minimum: i32,
    pub maximum: Option<i32>,
    pub step: i32,
    pub display_order: i32,
    pub auto_select_combo: bool,
    pub include_in_price_range: bool,
    pub cineville_box: bool,
    pub membership: Option<String>,
}
