use axum::{
    Json,
    extract::{Multipart, State},
};
use database::models::import_session::ImportSessionStatus;
use database::repos::import::CreateSession;
use tracing::warn;

use crate::{
    AppState,
    dto::import::UploadResponse,
    error::AppError,
    extractors::auth::EditorUser,
    import::{csv_parser, storage},
};

const MAX_FILE_BYTES: usize = 10 * 1024 * 1024; // 10 MiB

/// POST /import/sessions — upload a CSV and create an import session.
///
/// Accepts a multipart form with two fields:
/// - `entity_type`: the target entity (e.g. "production")
/// - `file`: the CSV file
///
/// Parses a preview, uploads the raw CSV to S3, creates an `import_sessions`
/// row, and transitions its status to `mapping`.
#[utoipa::path(
    post,
    path = "/import/sessions",
    request_body(content = Vec<u8>, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "CSV uploaded and parsed", body = UploadResponse),
        (status = 400, description = "Invalid CSV, missing fields, file too large, or unsupported entity_type"),
        (status = 401, description = "Not authenticated"),
        (status = 500, description = "Internal error (S3 not configured, database error)"),
    ),
    tag = "import",
)]
pub async fn upload_session(
    State(state): State<AppState>,
    user: EditorUser,
    mut mp: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    // Step 1: consume all multipart fields
    let mut entity_type_opt: Option<String> = None;
    let mut file_bytes_opt: Option<Vec<u8>> = None;
    let mut filename_opt: Option<String> = None;

    while let Some(field) = mp
        .next_field()
        .await
        .map_err(|e| AppError::PayloadError(format!("multipart error: {e}")))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "entity_type" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| AppError::PayloadError(format!("failed to read entity_type: {e}")))?;
                entity_type_opt = Some(text);
            }
            "file" => {
                // Capture filename before consuming the field body
                filename_opt = field.file_name().map(str::to_string);

                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::PayloadError(format!("failed to read file field: {e}")))?;

                if bytes.len() > MAX_FILE_BYTES {
                    return Err(AppError::PayloadError(
                        "file exceeds 10 MiB limit".to_string(),
                    ));
                }

                file_bytes_opt = Some(bytes.to_vec());
            }
            _ => {
                // Ignore unknown fields — consume to avoid stalling the stream
                let _ = field.bytes().await;
            }
        }
    }

    let entity_type = match entity_type_opt {
        None => return Err(AppError::PayloadError("missing 'entity_type' field".to_string())),
        Some(s) if s.is_empty() => {
            return Err(AppError::PayloadError("'entity_type' field is empty".to_string()));
        }
        Some(s) => s,
    };

    let bytes = file_bytes_opt
        .ok_or_else(|| AppError::PayloadError("missing 'file' field".to_string()))?;

    // Step 2: validate entity_type
    if state.import_registry.get(&entity_type).is_none() {
        return Err(AppError::PayloadError(format!(
            "unsupported entity_type: {entity_type}"
        )));
    }

    // Step 3: parse CSV preview
    let preview = csv_parser::parse_preview(&bytes)
        .map_err(|e| AppError::PayloadError(e.to_string()))?;

    // Step 4: verify S3 is configured (before creating DB records)
    let s3_client = state
        .s3_client
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 not configured".to_string()))?;
    let s3_cfg = state
        .config
        .s3
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 not configured".to_string()))?;
    let bucket = s3_cfg.bucket.as_str();

    // Step 5: determine filename
    let filename = sanitise_filename(&filename_opt.unwrap_or_else(|| "upload.csv".to_string()));

    // Step 6: create DB session row (status = uploaded)
    let session_id = state
        .db
        .imports()
        .create_session(CreateSession {
            entity_type: entity_type.clone(),
            filename: filename.clone(),
            original_headers: preview.headers.clone(),
            created_by: user.0.id,
        })
        .await?;

    // Step 7: upload CSV to S3
    let s3_key = match storage::put_csv(s3_client, bucket, session_id, &filename, bytes).await {
        Ok(key) => key,
        Err(e) => {
            warn!(
                session_id = %session_id,
                "S3 upload failed after session created; session left in 'uploaded' state: {e}"
            );
            return Err(e);
        }
    };

    // Step 8: record S3 key
    if let Err(e) = state.db.imports().set_file_key(session_id, s3_key).await {
        warn!(
            session_id = %session_id,
            "set_file_key failed; session left in 'uploaded' state: {e}"
        );
        return Err(e.into());
    }

    // Step 9: transition to mapping
    state
        .db
        .imports()
        .update_status(session_id, ImportSessionStatus::Mapping, None)
        .await?;

    // Step 10: return preview
    Ok(Json(UploadResponse {
        session_id,
        headers: preview.headers,
        preview: preview.preview_rows,
        row_count: preview.total_rows as i64,
    }))
}

/// Strip control characters (including newlines and null bytes) from a raw
/// filename supplied by the user, then truncate to 255 code-points.
/// Falls back to `"upload.csv"` if the result would be empty.
fn sanitise_filename(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| !c.is_control())
        .take(255)
        .collect();
    if cleaned.is_empty() {
        "upload.csv".to_string()
    } else {
        cleaned
    }
}
