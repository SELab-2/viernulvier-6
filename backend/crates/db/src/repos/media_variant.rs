use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::media_variant::{MediaVariant, MediaVariantCreate},
};

pub struct MediaVariantRepo<'a> {
    db: &'a PgPool,
}

pub struct CropVariantUpsert {
    pub media_id: Uuid,
    pub crop_name: String,
    pub s3_key: String,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub checksum: Option<String>,
    pub source_uri: Option<String>,
}

impl<'a> MediaVariantRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn for_media(&self, media_id: Uuid) -> Result<Vec<MediaVariant>, DatabaseError> {
        Ok(MediaVariant::select()
            .where_("media_id = $1")
            .bind(media_id)
            .fetch_all(self.db)
            .await?)
    }

    pub async fn for_media_kind(
        &self,
        media_id: Uuid,
        variant_kind: &str,
    ) -> Result<Vec<MediaVariant>, DatabaseError> {
        Ok(MediaVariant::select()
            .where_("media_id = $1 AND variant_kind = $2")
            .bind(media_id)
            .bind(variant_kind)
            .fetch_all(self.db)
            .await?)
    }

    pub async fn upsert_crop(&self, upsert: CropVariantUpsert) -> Result<(), DatabaseError> {
        let create = MediaVariantCreate {
            media_id: upsert.media_id,
            variant_kind: "crop".to_string(),
            crop_name: Some(upsert.crop_name.clone()),
            s3_key: upsert.s3_key.clone(),
            mime_type: upsert.mime_type.clone(),
            file_size: upsert.file_size,
            width: upsert.width,
            height: upsert.height,
            checksum: upsert.checksum.clone(),
            source_uri: upsert.source_uri.clone(),
        };

        if create.insert(self.db).await.is_ok() {
            Ok(())
        } else {
            sqlx::query(
                r#"
                UPDATE media_variant
                SET
                    s3_key = $1,
                    mime_type = $2,
                    file_size = $3,
                    width = $4,
                    height = $5,
                    checksum = $6,
                    source_uri = $7,
                    updated_at = NOW()
                WHERE media_id = $8
                  AND variant_kind = 'crop'
                  AND crop_name = $9
                "#,
            )
            .bind(upsert.s3_key)
            .bind(upsert.mime_type)
            .bind(upsert.file_size)
            .bind(upsert.width)
            .bind(upsert.height)
            .bind(upsert.checksum)
            .bind(upsert.source_uri)
            .bind(upsert.media_id)
            .bind(upsert.crop_name)
            .execute(self.db)
            .await?;
            Ok(())
        }
    }
}
