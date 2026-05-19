use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::import_error::{ImportError, ImportErrorCreate},
};

pub struct ImportErrorRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ImportErrorRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn list(
        &self,
        limit: i64,
        resolved: bool,
    ) -> Result<Vec<ImportError>, DatabaseError> {
        self.all(limit as usize, None, resolved).await
    }

    pub async fn all(
        &self,
        limit: usize,
        cursor: Option<(DateTime<Utc>, Uuid)>,
        resolved: bool,
    ) -> Result<Vec<ImportError>, DatabaseError> {
        let mut query = sqlx::QueryBuilder::new("SELECT * FROM import_errors WHERE ");

        if resolved {
            query.push("resolved_at IS NOT NULL");
        } else {
            query.push("resolved_at IS NULL");
        }

        if let Some((last_seen_at, id)) = cursor {
            query
                .push(" AND (last_seen_at, id) < (")
                .push_bind(last_seen_at)
                .push(", ")
                .push_bind(id)
                .push(")");
        }

        query
            .push(" ORDER BY last_seen_at DESC, id DESC LIMIT ")
            .push_bind(limit as i64);

        Ok(query.build_query_as::<ImportError>().fetch_all(self.db).await?)
    }

    pub async fn unresolved(&self, limit: i64) -> Result<Vec<ImportError>, DatabaseError> {
        self.list(limit, false).await
    }

    pub async fn record(&self, error: ImportErrorCreate) -> Result<ImportError, DatabaseError> {
        if let Some(existing) = sqlx::query_as::<_, ImportError>(
            "UPDATE import_errors
             SET
                updated_at = now(),
                last_seen_at = now(),
                run_id = $1,
                severity = $2,
                message = $9,
                payload = $10
             WHERE resolved_at IS NULL
               AND entity = $3
               AND source_id IS NOT DISTINCT FROM $4
               AND error_kind = $5
               AND field IS NOT DISTINCT FROM $6
               AND relation IS NOT DISTINCT FROM $7
               AND relation_source_id IS NOT DISTINCT FROM $8
             RETURNING *",
        )
        .bind(error.run_id)
        .bind(&error.severity)
        .bind(&error.entity)
        .bind(error.source_id)
        .bind(&error.error_kind)
        .bind(&error.field)
        .bind(&error.relation)
        .bind(error.relation_source_id)
        .bind(&error.message)
        .bind(&error.payload)
        .fetch_optional(self.db)
        .await?
        {
            return Ok(existing);
        }

        Ok(sqlx::query_as::<_, ImportError>(
            "INSERT INTO import_errors (
                run_id,
                severity,
                entity,
                source_id,
                error_kind,
                field,
                relation,
                relation_source_id,
                message,
                payload
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *",
        )
        .bind(error.run_id)
        .bind(error.severity)
        .bind(error.entity)
        .bind(error.source_id)
        .bind(error.error_kind)
        .bind(error.field)
        .bind(error.relation)
        .bind(error.relation_source_id)
        .bind(error.message)
        .bind(error.payload)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn resolve_for_item(
        &self,
        entity: &str,
        source_id: Option<i32>,
    ) -> Result<u64, DatabaseError> {
        let result = sqlx::query(
            "UPDATE import_errors
             SET
                updated_at = now(),
                resolved_at = now()
             WHERE resolved_at IS NULL
               AND entity = $1
               AND source_id IS NOT DISTINCT FROM $2",
        )
        .bind(entity)
        .bind(source_id)
        .execute(self.db)
        .await?;

        Ok(result.rows_affected())
    }

    /// Batched variant of `resolve_for_item` for marking many items resolved
    /// in a single round trip. Used by the importer to resolve previous errors
    /// for everything that succeeded in the current batch without an UPDATE
    /// per item. Items with `NULL` `source_id` cannot be addressed individually
    /// and must continue to use `resolve_for_item`.
    pub async fn resolve_for_items(
        &self,
        entity: &str,
        source_ids: &[i32],
    ) -> Result<u64, DatabaseError> {
        if source_ids.is_empty() {
            return Ok(0);
        }

        let result = sqlx::query(
            "UPDATE import_errors
             SET
                updated_at = now(),
                resolved_at = now()
             WHERE resolved_at IS NULL
               AND entity = $1
               AND source_id = ANY($2)",
        )
        .bind(entity)
        .bind(source_ids)
        .execute(self.db)
        .await?;

        Ok(result.rows_affected())
    }
}
