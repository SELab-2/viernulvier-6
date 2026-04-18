use aws_sdk_s3::presigning::PresigningConfig;
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use database::{Database, models::entity_type::EntityType};
use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;
use std::collections::HashSet;
use std::time::Duration;
use uuid::Uuid;

use crate::{
    AppState,
    config::S3Config,
    dto::{
        media::{
            AttachMediaRequest, LinkMediaRequest, MediaPayload, MediaVariantPayload, ReconcileResponse,
            UploadUrlRequest, UploadUrlResponse,
        },
        paginated::PaginatedResponse,
    },
    error::AppError,
    handlers::{
        IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse,
        queries::{media::MediaSearchQuery, pagination::PaginationQuery},
    },
};

#[utoipa::path(
    method(get),
    path = "/media",
    tag = "Media",
    operation_id = "get_all_media",
    description = "List and search media records with cursor-based pagination.",
    params(
        PaginationQuery,
        MediaSearchQuery
    ),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<MediaPayload>)
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
    Query(pagination): Query<PaginationQuery>,
    Query(search): Query<MediaSearchQuery>,
) -> JsonResponse<PaginatedResponse<MediaPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());

    MediaPayload::all(&db, pagination.cursor, pagination.limit, public_url, search)
        .await?
        .json()
}

#[utoipa::path(
    method(get),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "get_media_by_id",
    description = "Get a single media record by media ID.",
    params(
        ("id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 200, description = "Success", body = MediaPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<MediaPayload> {
    let media = db.media().by_id(id).await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let mut payload = MediaPayload::from_model(media, public_url);

    let variants = db.media_variants().for_media(id).await?;
    payload.crops = variants
        .into_iter()
        .map(|v| MediaVariantPayload::from_model(v, public_url))
        .collect();

    Ok(Json(payload))
}

const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "pdf"];
const ALLOWED_MIME_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "application/pdf",
];

fn validate_upload_request(req: &UploadUrlRequest) -> Result<(), AppError> {
    let ext = std::path::Path::new(&req.filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .to_ascii_lowercase();

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::PayloadError(format!(
            "file extension '{ext}' is not allowed"
        )));
    }

    if !ALLOWED_MIME_TYPES.contains(&req.mime_type.as_str()) {
        return Err(AppError::PayloadError(format!(
            "MIME type '{}' is not allowed",
            req.mime_type
        )));
    }

    let expected_mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "pdf" => "application/pdf",
        _ => "",
    };

    if !expected_mime.is_empty() && req.mime_type != expected_mime {
        return Err(AppError::PayloadError(format!(
            "MIME type '{}' does not match extension '{}'",
            req.mime_type, ext
        )));
    }

    Ok(())
}

type HmacSha256 = Hmac<Sha256>;

pub fn generate_upload_token(secret: &str, s3_key: &str) -> Result<String, AppError> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| AppError::Crypto(format!("HMAC init failed: {e}")))?;
    mac.update(s3_key.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

fn verify_upload_token(secret: &str, s3_key: &str, token: &str) -> Result<bool, AppError> {
    let expected = hex::decode(token)
        .map_err(|e| AppError::Crypto(format!("invalid upload token hex: {e}")))?;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| AppError::Crypto(format!("HMAC init failed: {e}")))?;
    mac.update(s3_key.as_bytes());
    Ok(mac.verify_slice(&expected).is_ok())
}

#[utoipa::path(
    method(post),
    path = "/media/upload-url",
    tag = "Media",
    operation_id = "generate_upload_url",
    description = "Generate a short-lived presigned S3/Garage PUT URL. Frontend uploads the file directly; backend credentials remain private.",
    request_body = UploadUrlRequest,
    responses(
        (status = 200, description = "Success", body = UploadUrlResponse),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse),
        (status = 503, description = "S3 not configured")
    ),
    security(("cookie_auth" = []))
)]
pub async fn generate_upload_url(
    State(state): State<AppState>,
    Json(req): Json<UploadUrlRequest>,
) -> Result<Json<UploadUrlResponse>, AppError> {
    validate_upload_request(&req)?;

    if req.file_size > state.config.max_upload_size_bytes {
        return Err(AppError::PayloadError(format!(
            "file size {} exceeds maximum upload size of {} bytes",
            req.file_size, state.config.max_upload_size_bytes
        )));
    }

    let (s3_client, s3_config) = s3_client_and_config(&state)?;

    let ext = std::path::Path::new(&req.filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin");

    let s3_key = format!("media/{}.{}", Uuid::now_v7(), ext);
    let expires_in = 300u64;

    let presigning_config = PresigningConfig::expires_in(Duration::from_secs(expires_in))
        .map_err(|e| AppError::Internal(format!("presigning config error: {e}")))?;

    let presigned = s3_client
        .put_object()
        .bucket(&s3_config.bucket)
        .key(&s3_key)
        .content_type(&req.mime_type)
        .content_length(req.file_size)
        .presigned(presigning_config)
        .await
        .map_err(|e| AppError::Internal(format!("failed to generate presigned URL: {e}")))?;

    let upload_token = generate_upload_token(&state.config.upload_secret, &s3_key)?;

    Ok(Json(UploadUrlResponse {
        s3_key,
        upload_url: presigned.uri().to_string(),
        expires_in,
        upload_token,
    }))
}

#[utoipa::path(
    method(put),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "update_media",
    description = "Update media metadata fields only. Storage location (s3_key) remains unchanged.",
    params(
        ("id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 200, description = "Success", body = MediaPayload),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse),
        (status = 404, description = "Not found")
    ),
    security(("cookie_auth" = []))
)]
pub async fn put(
    State(state): State<AppState>,
    db: Database,
    Json(payload): Json<MediaPayload>,
) -> JsonResponse<MediaPayload> {
    let existing = db.media().by_id(payload.id).await?;
    let media = db
        .media()
        .update(payload.merge_into_existing(existing))
        .await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    Ok(Json(MediaPayload::from_model(media, public_url)))
}

#[utoipa::path(
    method(delete),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "delete_media",
    description = "Delete a media record and attempt to delete its S3 object.",
    params(
        ("id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse),
        (status = 404, description = "Not found")
    ),
    security(("cookie_auth" = []))
)]
pub async fn delete(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> StatusResponse {
    // get the media first to verify it exists
    let _ = db.media().by_id(id).await?;

    // delete from db and get all associated s3 keys (including derivatives and variants)
    let s3_keys = db.media().delete(id).await?;

    // delete from S3
    if let (Some(s3_config), Some(s3_client)) = (&state.config.s3, &state.s3_client) {
        for key in &s3_keys {
            let _ = s3_client
                .delete_object()
                .bucket(&s3_config.bucket)
                .key(key)
                .send()
                .await;
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(get),
    path = "/media/entity/{entity_type}/{entity_id}",
    tag = "Media",
    operation_id = "get_entity_media",
    description = "Get media linked to an entity. Use role/pagination filters. If cover_only=true and no explicit cover is set, the first item by ordering is returned.",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID"),
        ("role" = Option<String>, Query, description = "Optional media role filter (e.g. gallery, poster, review, cover)"),
        ("cover_only" = Option<bool>, Query, description = "If true, return one cover item; falls back to first ordered item when no explicit cover exists"),
        ("include_crops" = Option<bool>, Query, description = "If true, include imported crop variants"),
        ("limit" = Option<u32>, Query, description = "Pagination size, default 50, max 200"),
        ("offset" = Option<u32>, Query, description = "Pagination offset")
    ),
    responses(
        (status = 200, description = "Success", body = [MediaPayload])
    )
)]
pub async fn get_entity_media(
    State(state): State<AppState>,
    db: Database,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
    Query(params): Query<GetEntityMediaQuery>,
) -> JsonResponse<Vec<MediaPayload>> {
    let et = parse_entity_type(&entity_type)?;
    let role = normalize_media_role_opt(params.role)?;
    let media = db
        .media()
        .for_entity_filtered(et, entity_id, role.as_deref(), false)
        .await?;
    let limit = params.limit.unwrap_or(50).clamp(1, 200) as usize;
    let offset = params.offset.unwrap_or(0) as usize;
    let media = if params.cover_only.unwrap_or(false) {
        // If an explicit cover exists, use it; otherwise default to the first item by sort order.
        let explicit_cover = db
            .media()
            .for_entity_filtered(et, entity_id, role.as_deref(), true)
            .await?;

        if explicit_cover.is_empty() {
            media.into_iter().take(1).collect::<Vec<_>>()
        } else {
            explicit_cover.into_iter().take(1).collect::<Vec<_>>()
        }
    } else {
        media
            .into_iter()
            .skip(offset)
            .take(limit)
            .collect::<Vec<_>>()
    };
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let include_crops = params.include_crops.unwrap_or(false);

    let mut payloads: Vec<MediaPayload> = Vec::with_capacity(media.len());
    for m in media {
        let mut payload = MediaPayload::from_model(m, public_url);
        if include_crops {
            let variants = db
                .media_variants()
                .for_media_kind(payload.id, "crop")
                .await?;
            payload.crops = variants
                .into_iter()
                .map(|v| MediaVariantPayload::from_model(v, public_url))
                .collect();
        }
        payloads.push(payload);
    }

    Ok(Json(payloads))
}

#[derive(Debug, serde::Deserialize)]
pub struct GetEntityMediaQuery {
    pub role: Option<String>,
    pub cover_only: Option<bool>,
    pub include_crops: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[utoipa::path(
    method(post),
    path = "/media/entity/{entity_type}/{entity_id}/attach",
    tag = "Media",
    operation_id = "attach_media_to_entity",
    description = "Primary CMS write endpoint: create/update media metadata by s3_key and link it to an entity in one transaction.",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    request_body = AttachMediaRequest,
    responses(
        (status = 201, description = "Created", body = MediaPayload),
        (status = 400, description = "Bad request"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn attach_to_entity(
    State(state): State<AppState>,
    db: Database,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
    Json(req): Json<AttachMediaRequest>,
) -> JsonStatusResponse<MediaPayload> {
    if !verify_upload_token(&state.config.upload_secret, &req.s3_key, &req.upload_token)? {
        return Err(AppError::PayloadError("invalid upload token".into()));
    }

    // Prevent metadata hijacking of existing media via ON CONFLICT (s3_key)
    if db.media().by_s3_key(&req.s3_key).await?.is_some() {
        return Err(AppError::Conflict(
            "s3_key is already in use by another media item".into(),
        ));
    }

    let et = parse_entity_type(&entity_type)?;
    let role = normalize_media_role_opt(req.role)?.unwrap_or_else(|| "gallery".to_string());

    let media_create = database::models::media::MediaCreate {
        s3_key: req.s3_key,
        mime_type: req.mime_type,
        file_size: req.file_size,
        width: req.width,
        height: req.height,
        checksum: req.checksum,
        alt_text_nl: req.alt_text_nl,
        alt_text_en: req.alt_text_en,
        alt_text_fr: req.alt_text_fr,
        description_nl: req.description_nl,
        description_en: req.description_en,
        description_fr: req.description_fr,
        credit_nl: req.credit_nl,
        credit_en: req.credit_en,
        credit_fr: req.credit_fr,
        geo_latitude: req.geo_latitude,
        geo_longitude: req.geo_longitude,
        parent_id: req.parent_id,
        derivative_type: req.derivative_type,
        gallery_type: req.gallery_type,
        source_id: None,
        source_system: "cms".to_string(),
        source_uri: None,
        source_updated_at: None,
    };

    let media = db
        .media()
        .create_or_attach(
            et,
            entity_id,
            &role,
            req.sort_order.unwrap_or(0),
            req.is_cover_image.unwrap_or(false),
            media_create,
        )
        .await?;

    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    MediaPayload::from_model(media, public_url).json_created()
}

#[utoipa::path(
    method(post),
    path = "/media/entity/{entity_type}/{entity_id}/link",
    tag = "Media",
    operation_id = "link_media_to_entity",
    description = "Link an existing media record to an entity. Does not modify media metadata or require an upload token.",
    params(
        ("entity_type" = String, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    request_body = LinkMediaRequest,
    responses(
        (status = 200, description = "Success", body = MediaPayload),
        (status = 404, description = "Media not found"),
        (status = 400, description = "Bad request")
    )
)]
pub async fn link_to_entity(
    State(state): State<AppState>,
    db: Database,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
    Json(req): Json<LinkMediaRequest>,
) -> JsonResponse<MediaPayload> {
    let et = parse_entity_type(&entity_type)?;
    let role = normalize_media_role_opt(req.role)?.unwrap_or_else(|| "gallery".to_string());

    let media = db.media().by_id(req.media_id).await?;

    db.media()
        .link_to_entity(
            et,
            entity_id,
            req.media_id,
            &role,
            req.sort_order.unwrap_or(0),
            req.is_cover_image.unwrap_or(false),
        )
        .await?;

    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    Ok(Json(MediaPayload::from_model(media, public_url)))
}

#[utoipa::path(
    method(delete),
    path = "/media/entity/{entity_type}/{entity_id}/{media_id}",
    tag = "Media",
    operation_id = "unlink_media_from_entity",
    description = "Unlink media from an entity only (does not directly delete media row/object). Orphans are handled by cleanup/reconcile flows.",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID"),
        ("media_id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse),
        (status = 404, description = "Not found")
    ),
    security(("cookie_auth" = []))
)]
pub async fn unlink_from_entity(
    db: Database,
    Path((entity_type, entity_id, media_id)): Path<(String, Uuid, Uuid)>,
) -> StatusResponse {
    let et = parse_entity_type(&entity_type)?;
    db.media()
        .unlink_from_entity(et, entity_id, media_id)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(post),
    path = "/media/entity/{entity_type}/{entity_id}/{media_id}/set-cover",
    tag = "Media",
    operation_id = "set_cover_for_entity",
    description = "Promote an already-linked media item to the cover role for an entity. Any existing cover is atomically demoted back to the gallery role.",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type"),
        ("entity_id" = Uuid, Path, description = "Entity UUID"),
        ("media_id" = Uuid, Path, description = "Media UUID to promote to cover")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse),
        (status = 404, description = "Not found")
    ),
    security(("cookie_auth" = []))
)]
pub async fn set_cover_for_entity(
    db: Database,
    Path((entity_type, entity_id, media_id)): Path<(String, Uuid, Uuid)>,
) -> StatusResponse {
    let et = parse_entity_type(&entity_type)?;
    db.media().set_cover(et, entity_id, media_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(delete),
    path = "/media/entity/{entity_type}/{entity_id}/cover",
    tag = "Media",
    operation_id = "clear_cover_for_entity",
    description = "Demote the current cover image back to the gallery role without removing the entity link.",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn clear_cover_for_entity(
    db: Database,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
) -> StatusResponse {
    let et = parse_entity_type(&entity_type)?;
    db.media().clear_cover(et, entity_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(post),
    path = "/media/cleanup",
    tag = "Media",
    operation_id = "cleanup_orphaned_media",
    description = "Business cleanup: remove media rows with no entity links (orphans) and attempt to delete their S3 objects.",
    responses(
        (status = 200, description = "Cleanup complete", body = CleanupResponse),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn cleanup_orphans(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<CleanupResponse> {
    let s3_keys = db.media().delete_orphans().await?;

    if let (Some(s3_config), Some(s3_client)) = (&state.config.s3, &state.s3_client) {
        for key in &s3_keys {
            let _ = s3_client
                .delete_object()
                .bucket(&s3_config.bucket)
                .key(key)
                .send()
                .await;
        }
    }

    Ok(Json(CleanupResponse {
        deleted_count: s3_keys.len(),
        s3_keys,
    }))
}

#[utoipa::path(
    method(post),
    path = "/media/reconcile",
    tag = "Media",
    operation_id = "reconcile_media_storage",
    description = "Storage drift check: compare DB media keys vs S3 objects. Dry-run by default; use apply=true to delete DB rows whose S3 object is missing.",
    params(
        ("apply" = Option<bool>, Query, description = "Apply destructive cleanup when true (default false)")
    ),
    responses(
        (status = 200, description = "Reconciliation complete", body = ReconcileResponse),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn reconcile_storage(
    State(state): State<AppState>,
    db: Database,
    Query(params): Query<ReconcileQuery>,
) -> JsonResponse<ReconcileResponse> {
    let (s3_client, s3_config) = s3_client_and_config(&state)?;

    let db_keys = db.media().all_s3_keys().await?;
    let db_set: HashSet<String> = db_keys.iter().cloned().collect();

    let mut s3_keys = Vec::<String>::new();
    let mut token: Option<String> = None;
    loop {
        let mut req = s3_client.list_objects_v2().bucket(&s3_config.bucket);
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("failed to list S3 objects: {e}")))?;

        if let Some(contents) = resp.contents {
            for obj in contents {
                if let Some(key) = obj.key {
                    s3_keys.push(key);
                }
            }
        }

        token = resp.next_continuation_token;
        if token.is_none() {
            break;
        }
    }

    let s3_set: HashSet<String> = s3_keys.iter().cloned().collect();

    let missing_in_s3: Vec<String> = db_set.difference(&s3_set).cloned().collect();
    let missing_in_db: Vec<String> = s3_set.difference(&db_set).cloned().collect();

    let applied = params.apply.unwrap_or(false);
    let deleted_missing_in_s3_count = if applied {
        db.media().delete_by_s3_keys(&missing_in_s3).await?
    } else {
        0
    };

    Ok(Json(ReconcileResponse {
        applied,
        db_key_count: db_keys.len(),
        s3_key_count: s3_keys.len(),
        missing_in_s3,
        missing_in_db,
        deleted_missing_in_s3_count,
    }))
}

#[derive(Debug, serde::Deserialize)]
pub struct ReconcileQuery {
    pub apply: Option<bool>,
}

#[derive(Debug, serde::Serialize, utoipa::ToSchema)]
pub struct CleanupResponse {
    pub deleted_count: usize,
    pub s3_keys: Vec<String>,
}

fn s3_client_and_config(state: &AppState) -> Result<(&aws_sdk_s3::Client, &S3Config), AppError> {
    let client = state
        .s3_client
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 not configured".to_string()))?;

    let config = state
        .config
        .s3
        .as_ref()
        .ok_or_else(|| AppError::Internal("S3 config not set".to_string()))?;

    Ok((client, config))
}

fn parse_entity_type(s: &str) -> Result<EntityType, AppError> {
    match s {
        "production" => Ok(EntityType::Production),
        "artist" => Ok(EntityType::Artist),
        "article" => Ok(EntityType::Article),
        "blogpost" => Ok(EntityType::Article),
        "media" => Ok(EntityType::Media),
        "event" => Ok(EntityType::Event),
        _ => Err(AppError::PayloadError(format!("invalid entity type: {s}"))),
    }
}

fn normalize_media_role_opt(role: Option<String>) -> Result<Option<String>, AppError> {
    role.map(|r| normalize_media_role(&r)).transpose()
}

fn normalize_media_role(role: &str) -> Result<String, AppError> {
    let normalized = role.trim().to_lowercase();
    let valid = matches!(
        normalized.as_str(),
        "gallery" | "cover" | "poster" | "review" | "hero" | "thumbnail" | "inline" | "media"
    );

    if valid {
        Ok(normalized)
    } else {
        Err(AppError::PayloadError(format!(
            "invalid media role: {role}"
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_media_role;

    #[test]
    fn valid_roles_are_normalized() {
        assert_eq!(normalize_media_role("  Poster ").unwrap(), "poster");
        assert_eq!(normalize_media_role("gallery").unwrap(), "gallery");
    }

    #[test]
    fn invalid_role_is_rejected() {
        assert!(normalize_media_role("unknown-role").is_err());
    }
}
