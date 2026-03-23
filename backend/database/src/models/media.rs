use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "MediaCreate")]
#[ormlite(table = "media")]
pub struct Media {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub s3_key: String,

    pub mime_type: String,
    pub file_size: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub checksum: Option<String>,

    pub alt_text: Option<String>,
    pub description: Option<String>,
    pub credit: Option<String>,

    pub geo_latitude: Option<f64>,
    pub geo_longitude: Option<f64>,

    pub parent_id: Option<Uuid>,
    pub derivative_type: Option<String>,
    pub gallery_type: Option<String>,
    pub source_id: Option<i32>,
    pub source_system: String,
    pub source_uri: Option<String>,
    pub source_updated_at: Option<DateTime<Utc>>,
}
