use base64::{Engine, prelude::BASE64_URL_SAFE};
use chrono::{DateTime, Utc};
use database::{
    Database,
    models::{filtering::cursor::CursorData, media::Media, media_variant::MediaVariant},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    dto::paginated::PaginatedResponse, error::AppError, handlers::queries::media::MediaSearchQuery,
};

impl MediaPayload {
    /// Build a MediaPayload from a database model, computing the public URL.
    /// `base_url` is the S3_PUBLIC_URL (e.g. "https://s3.example.com/bucket").
    pub fn from_model(m: Media, base_url: Option<&str>) -> Self {
        let url = if m.s3_key.is_empty() {
            m.source_uri.clone()
        } else {
            base_url.map(|base| format!("{}/{}", base.trim_end_matches('/'), m.s3_key))
        };

        Self {
            id: m.id,
            created_at: m.created_at,
            updated_at: m.updated_at,
            url,
            s3_key: m.s3_key,
            mime_type: m.mime_type,
            file_size: m.file_size,
            width: m.width,
            height: m.height,
            checksum: m.checksum,
            alt_text_nl: m.alt_text_nl,
            alt_text_en: m.alt_text_en,
            alt_text_fr: m.alt_text_fr,
            description_nl: m.description_nl,
            description_en: m.description_en,
            description_fr: m.description_fr,
            credit_nl: m.credit_nl,
            credit_en: m.credit_en,
            credit_fr: m.credit_fr,
            geo_latitude: m.geo_latitude,
            geo_longitude: m.geo_longitude,
            parent_id: m.parent_id,
            derivative_type: m.derivative_type,
            gallery_type: m.gallery_type,
            source_system: m.source_system,
            source_uri: m.source_uri,
            crops: Vec::new(),
        }
    }

    pub async fn all(
        db: &Database,
        id_cursor: Option<String>,
        limit: u32,
        public_url: Option<&str>,
        search: MediaSearchQuery,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let cursor: Option<CursorData> = id_cursor.and_then(|b64| {
            let bytes = BASE64_URL_SAFE.decode(b64).ok()?;
            serde_json::from_slice(&bytes).ok()
        });

        let (media, next_cursor) = db.media().all(limit, cursor, search.into()).await?;

        let next_cursor_data = next_cursor.and_then(|c| {
            let data = serde_json::to_vec(&c).ok()?;
            Some(BASE64_URL_SAFE.encode(data))
        });

        let payloads: Vec<Self> = media
            .into_iter()
            .map(|m| Self::from_model(m, public_url))
            .collect();

        Ok(PaginatedResponse {
            data: payloads,
            next_cursor: next_cursor_data,
        })
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Media, AppError> {
        Ok(db.media().by_id(id).await?)
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<Vec<String>, AppError> {
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
    /// The S3 object key (needed to link existing media to another entity)
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
    pub source_system: String,
    pub source_uri: Option<String>,
    pub crops: Vec<MediaVariantPayload>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MediaVariantPayload {
    pub id: Uuid,
    pub media_id: Uuid,
    pub variant_kind: String,
    pub crop_name: Option<String>,
    pub url: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub checksum: Option<String>,
    pub source_uri: Option<String>,
}

impl MediaVariantPayload {
    pub fn from_model(v: MediaVariant, base_url: Option<&str>) -> Self {
        let url = if v.s3_key.is_empty() {
            v.source_uri.clone()
        } else {
            base_url.map(|base| format!("{}/{}", base.trim_end_matches('/'), v.s3_key))
        };

        Self {
            id: v.id,
            media_id: v.media_id,
            variant_kind: v.variant_kind,
            crop_name: v.crop_name,
            url,
            mime_type: v.mime_type,
            file_size: v.file_size,
            width: v.width,
            height: v.height,
            checksum: v.checksum,
            source_uri: v.source_uri,
        }
    }
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
            alt_text_nl: p.alt_text_nl,
            alt_text_en: p.alt_text_en,
            alt_text_fr: p.alt_text_fr,
            description_nl: p.description_nl,
            description_en: p.description_en,
            description_fr: p.description_fr,
            credit_nl: p.credit_nl,
            credit_en: p.credit_en,
            credit_fr: p.credit_fr,
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
            alt_text_nl: self.alt_text_nl,
            alt_text_en: self.alt_text_en,
            alt_text_fr: self.alt_text_fr,
            description_nl: self.description_nl,
            description_en: self.description_en,
            description_fr: self.description_fr,
            credit_nl: self.credit_nl,
            credit_en: self.credit_en,
            credit_fr: self.credit_fr,
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
    /// HMAC token that must be presented when attaching this upload
    pub upload_token: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AttachMediaRequest {
    pub s3_key: String,
    pub upload_token: String,
    pub mime_type: String,
    pub role: Option<String>,
    pub sort_order: Option<i32>,
    pub is_cover_image: Option<bool>,
    pub alt_text_nl: Option<String>,
    pub alt_text_en: Option<String>,
    pub alt_text_fr: Option<String>,

    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub description_fr: Option<String>,

    pub credit_nl: Option<String>,
    pub credit_en: Option<String>,
    pub credit_fr: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub checksum: Option<String>,
    pub geo_latitude: Option<f64>,
    pub geo_longitude: Option<f64>,
    pub parent_id: Option<Uuid>,
    pub derivative_type: Option<String>,
    pub gallery_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LinkMediaRequest {
    pub media_id: Uuid,
    pub role: Option<String>,
    pub sort_order: Option<i32>,
    pub is_cover_image: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ReconcileResponse {
    pub applied: bool,
    pub db_key_count: usize,
    pub s3_key_count: usize,
    pub missing_in_s3: Vec<String>,
    pub missing_in_db: Vec<String>,
    pub deleted_missing_in_s3_count: u64,
}
