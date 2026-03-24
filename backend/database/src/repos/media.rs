use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        entity_type::EntityType,
        media::{Media, MediaCreate},
    },
};

pub struct MediaRepo<'a> {
    db: &'a PgPool,
}

impl<'a> MediaRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Media, DatabaseError> {
        Media::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Media>, DatabaseError> {
        Ok(Media::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn paginated(
        &self,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Media>, DatabaseError> {
        Ok(sqlx::query_as::<_, Media>(
            r#"
            SELECT
                id, created_at, updated_at,
                s3_key, mime_type, file_size,
                width, height, checksum,
                alt_text_nl, alt_text_en, alt_text_fr, 
                description_nl, description_en, description_fr, 
                credit_nl, credit_en, credit_fr,
                geo_latitude, geo_longitude,
                parent_id, derivative_type, gallery_type, source_id,
                source_system, source_uri, source_updated_at
            FROM media
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(self.db)
        .await?)
    }

    pub async fn insert(&self, media: MediaCreate) -> Result<Media, DatabaseError> {
        Ok(media.insert(self.db).await?)
    }

    pub async fn create_or_attach(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
        role: &str,
        sort_order: i32,
        is_cover_image: bool,
        media: MediaCreate,
    ) -> Result<Media, DatabaseError> {
        let mut tx = self.db.begin().await?;

        let media_row: Media = sqlx::query_as(
            r#"
            INSERT INTO media (
                s3_key, mime_type, file_size, width, height, checksum,
                alt_text_nl, alt_text_en, alt_text_fr, 
                description_nl, description_en, description_fr, 
                credit_nl, credit_en, credit_fr,
                geo_latitude, geo_longitude,
                parent_id, derivative_type, gallery_type,
                source_id, source_system, source_uri, source_updated_at,
                created_at, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9,
                $10, $11,
                $12, $13, $14,
                $15, $16, $17, $18,
                $19, $20
            )
            ON CONFLICT (s3_key)
            DO UPDATE SET
                mime_type = EXCLUDED.mime_type,
                file_size = EXCLUDED.file_size,
                width = EXCLUDED.width,
                height = EXCLUDED.height,
                checksum = EXCLUDED.checksum,
                alt_text_nl = EXCLUDED.alt_text_nl,
                alt_text_en = EXCLUDED.alt_text_en,
                alt_text_fr = EXCLUDED.alt_text_fr,
                description_nl = EXCLUDED.description_nl,
                description_en = EXCLUDED.description_en,
                description_fr = EXCLUDED.description_fr,
                credit_nl = EXCLUDED.credit_nl,
                credit_en = EXCLUDED.credit_en,
                credit_fr = EXCLUDED.credit_fr,
                geo_latitude = EXCLUDED.geo_latitude,
                geo_longitude = EXCLUDED.geo_longitude,
                parent_id = EXCLUDED.parent_id,
                derivative_type = EXCLUDED.derivative_type,
                gallery_type = EXCLUDED.gallery_type,
                updated_at = NOW()
            RETURNING
                id, created_at, updated_at,
                s3_key, mime_type, file_size,
                width, height, checksum,
                alt_text_nl, alt_text_en, alt_text_fr, 
                description_nl, description_en, description_fr, 
                credit_nl, credit_en, credit_fr,
                geo_latitude, geo_longitude,
                parent_id, derivative_type, gallery_type, source_id,
                source_system, source_uri, source_updated_at
            "#,
        )
        .bind(media.s3_key)
        .bind(media.mime_type)
        .bind(media.file_size)
        .bind(media.width)
        .bind(media.height)
        .bind(media.checksum)
        .bind(media.alt_text_nl)
        .bind(media.alt_text_en)
        .bind(media.alt_text_fr)
        .bind(media.description_nl)
        .bind(media.description_en)
        .bind(media.description_fr)
        .bind(media.credit_nl)
        .bind(media.credit_en)
        .bind(media.credit_fr)
        .bind(media.geo_latitude)
        .bind(media.geo_longitude)
        .bind(media.parent_id)
        .bind(media.derivative_type)
        .bind(media.gallery_type)
        .bind(media.source_id)
        .bind(media.source_system)
        .bind(media.source_uri)
        .bind(media.source_updated_at)
        .bind(media.created_at)
        .bind(media.updated_at)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO entity_media (entity_type, entity_id, media_id, role, sort_order, is_cover_image)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (entity_type, entity_id, media_id)
            DO UPDATE SET role = $4, sort_order = $5, is_cover_image = $6
            "#,
        )
        .bind(entity_type as EntityType)
        .bind(entity_id)
        .bind(media_row.id)
        .bind(role)
        .bind(sort_order)
        .bind(is_cover_image)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(media_row)
    }

    pub async fn update(&self, media: Media) -> Result<Media, DatabaseError> {
        Ok(media.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM media WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn by_s3_key(&self, s3_key: &str) -> Result<Option<Media>, DatabaseError> {
        Ok(Media::select()
            .where_("s3_key = $1")
            .bind(s3_key)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Media>, DatabaseError> {
        Ok(Media::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn by_source_uri(
        &self,
        source_system: &str,
        source_uri: &str,
    ) -> Result<Option<Media>, DatabaseError> {
        Ok(Media::select()
            .where_("source_system = $1 AND source_uri = $2")
            .bind(source_system)
            .bind(source_uri)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn derivatives(&self, parent_id: Uuid) -> Result<Vec<Media>, DatabaseError> {
        Ok(Media::select()
            .where_("parent_id = $1")
            .bind(parent_id)
            .fetch_all(self.db)
            .await?)
    }

    /// Link a media item to an entity
    pub async fn link_to_entity(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
        media_id: Uuid,
        role: &str,
        sort_order: i32,
        is_cover_image: bool,
    ) -> Result<(), DatabaseError> {
        sqlx::query(
            r#"
            INSERT INTO entity_media (entity_type, entity_id, media_id, role, sort_order, is_cover_image)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (entity_type, entity_id, media_id)
            DO UPDATE SET role = $4, sort_order = $5, is_cover_image = $6
            "#,
        )
        .bind(entity_type as EntityType)
        .bind(entity_id)
        .bind(media_id)
        .bind(role)
        .bind(sort_order)
        .bind(is_cover_image)
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Unlink a media item from an entity
    pub async fn unlink_from_entity(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
        media_id: Uuid,
    ) -> Result<(), DatabaseError> {
        let res = sqlx::query(
            "DELETE FROM entity_media WHERE entity_type = $1 AND entity_id = $2 AND media_id = $3",
        )
        .bind(entity_type as EntityType)
        .bind(entity_id)
        .bind(media_id)
        .execute(self.db)
        .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    /// Get all media linked to an entity, ordered by sort_order
    pub async fn for_entity(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
    ) -> Result<Vec<Media>, DatabaseError> {
        Ok(sqlx::query_as(
            r#"
            SELECT
                m.id, m.created_at, m.updated_at,
                m.s3_key, m.mime_type, m.file_size,
                m.width, m.height, m.checksum,
                m.alt_text, m.description, m.credit,
                m.geo_latitude, m.geo_longitude,
                m.parent_id, m.derivative_type, m.gallery_type, m.source_id,
                m.source_system, m.source_uri, m.source_updated_at
            FROM media m
            JOIN entity_media em ON em.media_id = m.id
            WHERE em.entity_type = $1 AND em.entity_id = $2
            ORDER BY em.sort_order
            "#,
        )
        .bind(entity_type as EntityType)
        .bind(entity_id)
        .fetch_all(self.db)
        .await?)
    }

    /// Get media for an entity with optional role/galler type and cover-only filtering
    pub async fn for_entity_filtered(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
        role: Option<&str>,
        cover_only: bool,
    ) -> Result<Vec<Media>, DatabaseError> {
        let mut query = String::from(
            r#"
            SELECT
                m.id, m.created_at, m.updated_at,
                m.s3_key, m.mime_type, m.file_size,
                m.width, m.height, m.checksum,
                m.alt_text, m.description, m.credit,
                m.geo_latitude, m.geo_longitude,
                m.parent_id, m.derivative_type, m.gallery_type, m.source_id,
                m.source_system, m.source_uri, m.source_updated_at
            FROM media m
            JOIN entity_media em ON em.media_id = m.id
            WHERE em.entity_type = $1 AND em.entity_id = $2
            "#,
        );

        if role.is_some() {
            query.push_str(" AND em.role = $3");
        }

        if cover_only {
            query.push_str(" AND em.is_cover_image = true");
        }

        query.push_str(" ORDER BY em.sort_order");

        let mut q = sqlx::query_as::<_, Media>(&query)
            .bind(entity_type as EntityType)
            .bind(entity_id);

        if let Some(role) = role {
            q = q.bind(role);
        }

        Ok(q.fetch_all(self.db).await?)
    }

    /// Find media that has no remaining entity links (orphans)
    pub async fn orphaned(&self) -> Result<Vec<Media>, DatabaseError> {
        Ok(sqlx::query_as(
            r#"
            SELECT
                m.id, m.created_at, m.updated_at,
                m.s3_key, m.mime_type, m.file_size,
                m.width, m.height, m.checksum,
                m.alt_text, m.description, m.credit,
                m.geo_latitude, m.geo_longitude,
                m.parent_id, m.derivative_type, m.gallery_type, m.source_id,
                m.source_system, m.source_uri, m.source_updated_at
            FROM media m
            LEFT JOIN entity_media em ON em.media_id = m.id
            WHERE em.id IS NULL AND m.parent_id IS NULL
            "#,
        )
        .fetch_all(self.db)
        .await?)
    }

    /// Delete all orphans and their derivatives, returns s3_keys to delete from storage
    pub async fn delete_orphans(&self) -> Result<Vec<String>, DatabaseError> {
        let orphans = self.orphaned().await?;
        let mut s3_keys = Vec::new();

        for orphan in &orphans {
            // collect s3_keys from derivatives first
            let derivatives = self.derivatives(orphan.id).await?;
            for d in &derivatives {
                s3_keys.push(d.s3_key.clone());
            }
            s3_keys.push(orphan.s3_key.clone());
        }

        // delete derivatives first, then orphans (parent_id cascade handles this, but be explicit)
        sqlx::query(
            r#"
            DELETE FROM media
            WHERE parent_id IN (
                SELECT m.id FROM media m
                LEFT JOIN entity_media em ON em.media_id = m.id
                WHERE em.id IS NULL AND m.parent_id IS NULL
            )
            "#,
        )
        .execute(self.db)
        .await?;

        sqlx::query(
            r#"
            DELETE FROM media
            WHERE id IN (
                SELECT m.id FROM media m
                LEFT JOIN entity_media em ON em.media_id = m.id
                WHERE em.id IS NULL AND m.parent_id IS NULL
            )
            "#,
        )
        .execute(self.db)
        .await?;

        Ok(s3_keys)
    }

    pub async fn all_s3_keys(&self) -> Result<Vec<String>, DatabaseError> {
        let rows = sqlx::query_as::<_, (String,)>("SELECT s3_key FROM media")
            .fetch_all(self.db)
            .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn delete_by_s3_keys(&self, keys: &[String]) -> Result<u64, DatabaseError> {
        if keys.is_empty() {
            return Ok(0);
        }

        let res = sqlx::query("DELETE FROM media WHERE s3_key = ANY($1)")
            .bind(keys)
            .execute(self.db)
            .await?;

        Ok(res.rows_affected())
    }
}
