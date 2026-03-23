use chrono::{DateTime, Utc};
use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "MediaVariantCreate")]
#[ormlite(table = "media_variant")]
pub struct MediaVariant {
    pub id: Uuid,
    pub media_id: Uuid,
    pub variant_kind: String,
    pub crop_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub s3_key: String,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub checksum: Option<String>,

    pub source_uri: Option<String>,
}
