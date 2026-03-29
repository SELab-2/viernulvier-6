use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "MediaCreate")]
#[ormlite(table = "media")]
pub struct Media {
    pub id: Uuid,
    #[ormlite(default)]
    pub created_at: DateTime<Utc>,
    #[ormlite(default)]
    pub updated_at: DateTime<Utc>,

    pub s3_key: String,

    pub mime_type: String,
    pub file_size: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub checksum: Option<String>,

    pub alt_text_nl: Option<String>,
    pub alt_text_en: Option<String>,
    pub alt_text_fr: Option<String>,

    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub description_fr: Option<String>,

    pub credit_nl: Option<String>,
    pub credit_en: Option<String>,
    pub credit_fr: Option<String>,

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
