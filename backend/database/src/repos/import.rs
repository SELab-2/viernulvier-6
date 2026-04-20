use std::collections::BTreeMap;

use sqlx::{PgPool, types::Json};
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        import_row::{DiffEntry, ImportRow, ImportRowStatus, ImportWarning, RawCell},
        import_session::{ImportMapping, ImportSession, ImportSessionStatus},
    },
};

pub struct ImportRepo<'a> {
    db: &'a PgPool,
}

/// Input for creating a new import session.
pub struct CreateSession {
    pub entity_type: String,
    pub filename: String,
    pub original_headers: Vec<String>,
    pub created_by: Uuid,
}

/// A single row to bulk-insert into `import_rows`.
pub struct NewImportRow {
    pub row_number: i32,
    pub raw_data: Json<BTreeMap<String, RawCell>>,
}

impl<'a> ImportRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    /// Insert a new session with status `uploaded`.  Returns the new session id.
    pub async fn create_session(&self, input: CreateSession) -> Result<Uuid, DatabaseError> {
        let id = sqlx::query_scalar!(
            r#"INSERT INTO import_sessions
               (entity_type, filename, original_headers, status, created_by)
               VALUES ($1, $2, $3, 'uploaded', $4)
               RETURNING id"#,
            input.entity_type,
            input.filename,
            &input.original_headers,
            input.created_by,
        )
        .fetch_one(self.db)
        .await?;

        Ok(id)
    }

    /// Return a session by id, or `None` if it doesn't exist.
    pub async fn get_session(&self, id: Uuid) -> Result<Option<ImportSession>, DatabaseError> {
        let session = sqlx::query_as!(
            ImportSession,
            r#"SELECT
               id,
               entity_type,
               filename,
               original_headers,
               mapping        AS "mapping: Json<ImportMapping>",
               status         AS "status: ImportSessionStatus",
               row_count,
               created_by,
               created_at,
               updated_at,
               committed_at,
               error
             FROM import_sessions
             WHERE id = $1"#,
            id,
        )
        .fetch_optional(self.db)
        .await?;

        Ok(session)
    }

    /// Return sessions ordered by `created_at DESC` with simple limit/offset pagination.
    pub async fn list_sessions(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<ImportSession>, DatabaseError> {
        let sessions = sqlx::query_as!(
            ImportSession,
            r#"SELECT
               id,
               entity_type,
               filename,
               original_headers,
               mapping        AS "mapping: Json<ImportMapping>",
               status         AS "status: ImportSessionStatus",
               row_count,
               created_by,
               created_at,
               updated_at,
               committed_at,
               error
             FROM import_sessions
             ORDER BY created_at DESC, id DESC
             LIMIT $1 OFFSET $2"#,
            limit,
            offset,
        )
        .fetch_all(self.db)
        .await?;

        Ok(sessions)
    }

    /// Persist a column mapping and advance the session status to `mapping`.
    pub async fn save_mapping(
        &self,
        id: Uuid,
        mapping: ImportMapping,
    ) -> Result<(), DatabaseError> {
        let mapping_json =
            serde_json::to_value(&mapping).map_err(|e| DatabaseError::BadRequest(e.to_string()))?;

        sqlx::query!(
            r#"UPDATE import_sessions
               SET mapping = $1, status = 'mapping'
               WHERE id = $2"#,
            mapping_json,
            id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Update the session status and optionally store an error message.
    pub async fn update_status(
        &self,
        id: Uuid,
        status: ImportSessionStatus,
        error: Option<String>,
    ) -> Result<(), DatabaseError> {
        let status_str = status_to_str(status);

        sqlx::query!(
            r#"UPDATE import_sessions
               SET status = $1, error = $2
               WHERE id = $3"#,
            status_str,
            error,
            id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Bulk-insert rows into `import_rows` and set `row_count` on the session.
    pub async fn insert_rows(
        &self,
        session_id: Uuid,
        rows: &[NewImportRow],
    ) -> Result<(), DatabaseError> {
        if rows.is_empty() {
            return Ok(());
        }

        let row_numbers: Vec<i32> = rows.iter().map(|r| r.row_number).collect();
        let raw_datas: Vec<serde_json::Value> = rows
            .iter()
            .map(|r| {
                serde_json::to_value(&r.raw_data.0)
                    .map_err(|e| DatabaseError::BadRequest(e.to_string()))
            })
            .collect::<Result<_, _>>()?;

        sqlx::query!(
            r#"INSERT INTO import_rows (session_id, row_number, raw_data, status)
               SELECT $1, t.row_number, t.raw_data, 'pending'
               FROM UNNEST($2::INT[], $3::JSONB[]) AS t(row_number, raw_data)"#,
            session_id,
            &row_numbers,
            &raw_datas,
        )
        .execute(self.db)
        .await?;

        let count = i32::try_from(rows.len()).unwrap_or(i32::MAX);

        sqlx::query!(
            r#"UPDATE import_sessions SET row_count = $1 WHERE id = $2"#,
            count,
            session_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Return a single import row by id, or `None` if it doesn't exist.
    pub async fn get_row(&self, row_id: Uuid) -> Result<Option<ImportRow>, DatabaseError> {
        let row = sqlx::query_as!(
            ImportRow,
            r#"SELECT
               id,
               session_id,
               row_number,
               raw_data       AS "raw_data: Json<BTreeMap<String, RawCell>>",
               overrides      AS "overrides: Json<BTreeMap<String, serde_json::Value>>",
               resolved_refs  AS "resolved_refs: Json<BTreeMap<String, Option<Uuid>>>",
               status         AS "status: ImportRowStatus",
               target_entity_id,
               diff           AS "diff: Json<BTreeMap<String, DiffEntry>>",
               warnings       AS "warnings: Json<Vec<ImportWarning>>"
             FROM import_rows
             WHERE id = $1"#,
            row_id,
        )
        .fetch_optional(self.db)
        .await?;

        Ok(row)
    }

    /// Return rows for a session ordered by `row_number`, with optional status filter.
    pub async fn get_rows(
        &self,
        session_id: Uuid,
        limit: i64,
        offset: i64,
        status_filter: Option<ImportRowStatus>,
    ) -> Result<Vec<ImportRow>, DatabaseError> {
        let rows = match status_filter {
            Some(status) => {
                let status_str = row_status_to_str(status);
                sqlx::query_as!(
                    ImportRow,
                    r#"SELECT
                       id,
                       session_id,
                       row_number,
                       raw_data       AS "raw_data: Json<BTreeMap<String, RawCell>>",
                       overrides      AS "overrides: Json<BTreeMap<String, serde_json::Value>>",
                       resolved_refs  AS "resolved_refs: Json<BTreeMap<String, Option<Uuid>>>",
                       status         AS "status: ImportRowStatus",
                       target_entity_id,
                       diff           AS "diff: Json<BTreeMap<String, DiffEntry>>",
                       warnings       AS "warnings: Json<Vec<ImportWarning>>"
                     FROM import_rows
                     WHERE session_id = $1 AND status = $2
                     ORDER BY row_number
                     LIMIT $3 OFFSET $4"#,
                    session_id,
                    status_str,
                    limit,
                    offset,
                )
                .fetch_all(self.db)
                .await?
            }
            None => {
                sqlx::query_as!(
                    ImportRow,
                    r#"SELECT
                       id,
                       session_id,
                       row_number,
                       raw_data       AS "raw_data: Json<BTreeMap<String, RawCell>>",
                       overrides      AS "overrides: Json<BTreeMap<String, serde_json::Value>>",
                       resolved_refs  AS "resolved_refs: Json<BTreeMap<String, Option<Uuid>>>",
                       status         AS "status: ImportRowStatus",
                       target_entity_id,
                       diff           AS "diff: Json<BTreeMap<String, DiffEntry>>",
                       warnings       AS "warnings: Json<Vec<ImportWarning>>"
                     FROM import_rows
                     WHERE session_id = $1
                     ORDER BY row_number
                     LIMIT $2 OFFSET $3"#,
                    session_id,
                    limit,
                    offset,
                )
                .fetch_all(self.db)
                .await?
            }
        };

        Ok(rows)
    }

    /// Persist an overrides map on a row.
    pub async fn update_row_overrides(
        &self,
        row_id: Uuid,
        overrides: Json<BTreeMap<String, serde_json::Value>>,
    ) -> Result<(), DatabaseError> {
        let val = serde_json::to_value(&overrides.0)
            .map_err(|e| DatabaseError::BadRequest(e.to_string()))?;

        sqlx::query!(
            r#"UPDATE import_rows SET overrides = $1 WHERE id = $2"#,
            val,
            row_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Persist a resolved-refs map on a row.
    pub async fn update_row_resolved_refs(
        &self,
        row_id: Uuid,
        resolved: Json<BTreeMap<String, Option<Uuid>>>,
    ) -> Result<(), DatabaseError> {
        let val = serde_json::to_value(&resolved.0)
            .map_err(|e| DatabaseError::BadRequest(e.to_string()))?;

        sqlx::query!(
            r#"UPDATE import_rows SET resolved_refs = $1 WHERE id = $2"#,
            val,
            row_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Set a row's status to `will_skip`.
    pub async fn mark_row_skipped(&self, row_id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query!(
            r#"UPDATE import_rows SET status = 'will_skip' WHERE id = $1"#,
            row_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Persist dry-run results: status, diff, and warnings.
    pub async fn save_dry_run_result(
        &self,
        row_id: Uuid,
        status: ImportRowStatus,
        diff: Option<Json<BTreeMap<String, DiffEntry>>>,
        warnings: Json<Vec<ImportWarning>>,
    ) -> Result<(), DatabaseError> {
        let status_str = row_status_to_str(status);

        let diff_val = diff
            .map(|d| {
                serde_json::to_value(&d.0).map_err(|e| DatabaseError::BadRequest(e.to_string()))
            })
            .transpose()?;

        let warnings_val = serde_json::to_value(&warnings.0)
            .map_err(|e| DatabaseError::BadRequest(e.to_string()))?;

        sqlx::query!(
            r#"UPDATE import_rows
               SET status = $1, diff = $2, warnings = $3
               WHERE id = $4"#,
            status_str,
            diff_val,
            warnings_val,
            row_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Upsert an S3 key for the session's source file.
    pub async fn set_file_key(
        &self,
        session_id: Uuid,
        s3_key: String,
    ) -> Result<(), DatabaseError> {
        sqlx::query!(
            r#"INSERT INTO import_session_files (session_id, s3_key)
               VALUES ($1, $2)
               ON CONFLICT (session_id) DO UPDATE SET s3_key = EXCLUDED.s3_key"#,
            session_id,
            s3_key,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Retrieve the S3 key stored for a session, or `None` if no file has been
    /// uploaded yet.
    pub async fn get_file_key(&self, session_id: Uuid) -> Result<Option<String>, DatabaseError> {
        let key = sqlx::query_scalar!(
            r#"SELECT s3_key FROM import_session_files WHERE session_id = $1"#,
            session_id,
        )
        .fetch_optional(self.db)
        .await?;

        Ok(key)
    }

    /// Delete all rows belonging to a session.
    ///
    /// Used at the start of a dry-run so that re-triggering the worker yields
    /// a clean, idempotent result.
    pub async fn delete_rows(&self, session_id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query!(
            r#"DELETE FROM import_rows WHERE session_id = $1"#,
            session_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Mark a row as committed (`created` or `updated`) with a target entity id.
    ///
    /// The terminal status is derived from the row's current planning status:
    /// - `will_create` → `created`
    /// - `will_update` → `updated`
    ///
    /// Returns `DatabaseError::BadRequest` if the row is not in a committable state.
    pub async fn record_committed_row(
        &self,
        row_id: Uuid,
        target_entity_id: Uuid,
    ) -> Result<(), DatabaseError> {
        let result = sqlx::query!(
            r#"UPDATE import_rows
               SET status = CASE status
                   WHEN 'will_create' THEN 'created'
                   WHEN 'will_update' THEN 'updated'
                   ELSE status
                 END,
                 target_entity_id = $2
               WHERE id = $1 AND status IN ('will_create', 'will_update')"#,
            row_id,
            target_entity_id,
        )
        .execute(self.db)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::BadRequest(format!(
                "row {row_id} is not in a committable state (expected will_create or will_update)"
            )));
        }

        Ok(())
    }

    /// Mark a row as `reverted`.
    pub async fn record_reverted_row(&self, row_id: Uuid) -> Result<(), DatabaseError> {
        sqlx::query!(
            r#"UPDATE import_rows SET status = 'reverted' WHERE id = $1"#,
            row_id,
        )
        .execute(self.db)
        .await?;

        Ok(())
    }

    /// Atomically claim the next pending/committing import session id.
    ///
    /// Uses `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)` so the
    /// row-level lock is held for the duration of the CAS statement. Two workers
    /// polling simultaneously cannot both claim the same row. Bumping `updated_at`
    /// also moves retried sessions to the back of the FIFO queue, which prevents
    /// a poison-pill row from blocking the worker.
    ///
    /// Returns `None` if no job is currently available.
    pub async fn claim_next_job(&self) -> Result<Option<Uuid>, DatabaseError> {
        let id = sqlx::query_scalar!(
            r#"UPDATE import_sessions
               SET updated_at = NOW()
               WHERE id = (
                   SELECT id FROM import_sessions
                   WHERE status IN ('dry_run_pending', 'committing')
                   ORDER BY updated_at
                   LIMIT 1
                   FOR UPDATE SKIP LOCKED
               )
               RETURNING id AS "id!: Uuid""#
        )
        .fetch_optional(self.db)
        .await?;
        Ok(id)
    }
}

// ─── helpers ────────────────────────────────────────────────────────────────

fn status_to_str(status: ImportSessionStatus) -> &'static str {
    match status {
        ImportSessionStatus::Uploaded => "uploaded",
        ImportSessionStatus::Mapping => "mapping",
        ImportSessionStatus::DryRunPending => "dry_run_pending",
        ImportSessionStatus::DryRunReady => "dry_run_ready",
        ImportSessionStatus::Committing => "committing",
        ImportSessionStatus::Committed => "committed",
        ImportSessionStatus::Failed => "failed",
        ImportSessionStatus::Cancelled => "cancelled",
    }
}

fn row_status_to_str(status: ImportRowStatus) -> &'static str {
    match status {
        ImportRowStatus::Pending => "pending",
        ImportRowStatus::WillCreate => "will_create",
        ImportRowStatus::WillUpdate => "will_update",
        ImportRowStatus::WillSkip => "will_skip",
        ImportRowStatus::Error => "error",
        ImportRowStatus::Created => "created",
        ImportRowStatus::Updated => "updated",
        ImportRowStatus::Skipped => "skipped",
        ImportRowStatus::Reverted => "reverted",
    }
}
