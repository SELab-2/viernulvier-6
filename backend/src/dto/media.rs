use chrono::{DateTime, Utc};
use database::{Database, models::media::Media};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

impl MediaPayload {
    /// Build a MediaPayload from a database model, computing the public URL.
    /// `base_url` is the S3_PUBLIC_URL (e.g. "https://s3.example.com/bucket").
    pub fn from_model(m: Media, base_url: Option<&str>) -> Self {
        let url = base_url.map(|base| format!("{}/{}", base.trim_end_matches('/'), m.s3_key));

        Self {
            id: m.id,
            created_at: m.created_at,
            updated_at: m.updated_at,
            url,
            mime_type: m.mime_type,
            file_size: m.file_size,
            width: m.width,
            height: m.height,
            checksum: m.checksum,
            alt_text: m.alt_text,
            description: m.description,
            credit: m.credit,
            geo_latitude: m.geo_latitude,
            geo_longitude: m.geo_longitude,
            parent_id: m.parent_id,
            derivative_type: m.derivative_type,
            gallery_type: m.gallery_type,
            source_system: m.source_system,
            source_uri: m.source_uri,
        }
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Media, AppError> {
        Ok(db.media().by_id(id).await?)
    }

    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Media>, AppError> {
        Ok(db.media().all(limit).await?)
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.media().delete(id).await?)
    }
}

/// Response payload for a media item. The `url` field is the direct public URL
/// the frontend can use to load the file (either from S3/Garage or an external CDN).
#[derive(Serialize, Deserialize, ToSchema)]
pub struct MediaPayload {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    /// Direct public URL to the media file (S3 or external)
    pub url: Option<String>,

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
    pub source_system: String,
    pub source_uri: Option<String>,
}

impl From<MediaPayload> for Media {
    fn from(p: MediaPayload) -> Self {
        Self {
            id: p.id,
            created_at: p.created_at,
            updated_at: p.updated_at,
            // Keep existing storage linkage on updates by leaving these untouched in handler logic.
            // This conversion is only safe when merged with the current DB record.
            s3_key: String::new(),
            mime_type: p.mime_type,
            file_size: p.file_size,
            width: p.width,
            height: p.height,
            checksum: p.checksum,
            alt_text: p.alt_text,
            description: p.description,
            credit: p.credit,
            geo_latitude: p.geo_latitude,
            geo_longitude: p.geo_longitude,
            parent_id: p.parent_id,
            derivative_type: p.derivative_type,
            gallery_type: p.gallery_type,
            source_id: None,
            source_system: p.source_system,
            source_uri: p.source_uri,
            source_updated_at: None,
        }
    }
}

impl MediaPayload {
    pub fn merge_into_existing(self, existing: Media) -> Media {
        Media {
            id: existing.id,
            created_at: existing.created_at,
            updated_at: self.updated_at,
            s3_key: existing.s3_key,
            mime_type: self.mime_type,
            file_size: self.file_size,
            width: self.width,
            height: self.height,
            checksum: self.checksum,
            alt_text: self.alt_text,
            description: self.description,
            credit: self.credit,
            geo_latitude: self.geo_latitude,
            geo_longitude: self.geo_longitude,
            parent_id: self.parent_id,
            derivative_type: self.derivative_type,
            gallery_type: self.gallery_type,
            source_id: existing.source_id,
            source_system: existing.source_system,
            source_uri: existing.source_uri,
            source_updated_at: existing.source_updated_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UploadUrlRequest {
    /// Original filename (used to derive the S3 key extension)
    pub filename: String,
    /// MIME type of the file (e.g., "image/jpeg")
    pub mime_type: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UploadUrlResponse {
    /// The S3 key where the file should be uploaded
    pub s3_key: String,
    /// Presigned PUT URL for direct upload
    pub upload_url: String,
    /// URL expiration in seconds
    pub expires_in: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SaveMediaRequest {
    /// The S3 key of the uploaded file
    pub s3_key: String,
    pub mime_type: String,
    pub alt_text: Option<String>,
    pub description: Option<String>,
    pub credit: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub checksum: Option<String>,
    pub geo_latitude: Option<f64>,
    pub geo_longitude: Option<f64>,
    pub parent_id: Option<Uuid>,
    pub derivative_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LinkMediaRequest {
    pub media_id: Uuid,
    pub sort_order: Option<i32>,
    pub is_cover_image: Option<bool>,
}
