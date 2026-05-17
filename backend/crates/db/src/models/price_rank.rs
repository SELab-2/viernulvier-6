use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "PriceRankCreate")]
#[ormlite(table = "price_ranks")]
pub struct PriceRank {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub code: String,
    pub position: i32,
    pub sold_out_buffer: Option<i32>,
}
