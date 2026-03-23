use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use aws_sdk_s3::presigning::PresigningConfig;
use chrono::Utc;
use database::{Database, models::entity_type::EntityType};
use std::time::Duration;
use uuid::Uuid;

use crate::{
    AppState,
    config::S3Config,
    dto::media::{
        LinkMediaRequest, MediaPayload, MediaVariantPayload, SaveMediaRequest, UploadUrlRequest,
        UploadUrlResponse,
    },
    error::AppError,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/media",
    tag = "Media",
    operation_id = "get_all_media",
    description = "Get all media",
    responses(
        (status = 200, description = "Success", body = [MediaPayload])
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<Vec<MediaPayload>> {
    let media = db.media().all(50).await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let payloads: Vec<MediaPayload> = media
        .into_iter()
        .map(|m| MediaPayload::from_model(m, public_url))
        .collect();
    Ok(Json(payloads))
}

#[utoipa::path(
    method(get),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "get_media_by_id",
    description = "Get a media item by id",
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
    Ok(Json(MediaPayload::from_model(media, public_url)))
}

#[utoipa::path(
    method(post),
    path = "/media/upload-url",
    tag = "Media",
    operation_id = "generate_upload_url",
    description = "Generate a presigned S3 upload URL for direct file upload",
    request_body = UploadUrlRequest,
    responses(
        (status = 200, description = "Success", body = UploadUrlResponse),
        (status = 503, description = "S3 not configured")
    )
)]
pub async fn generate_upload_url(
    State(state): State<AppState>,
    Json(req): Json<UploadUrlRequest>,
) -> Result<Json<UploadUrlResponse>, AppError> {
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
        .presigned(presigning_config)
        .await
        .map_err(|e| AppError::Internal(format!("failed to generate presigned URL: {e}")))?;

    Ok(Json(UploadUrlResponse {
        s3_key,
        upload_url: presigned.uri().to_string(),
        expires_in,
    }))
}

#[utoipa::path(
    method(post),
    path = "/media",
    tag = "Media",
    operation_id = "save_media",
    description = "Save media metadata after file has been uploaded to S3",
    request_body = SaveMediaRequest,
    responses(
        (status = 201, description = "Created", body = MediaPayload),
        (status = 400, description = "Bad request")
    )
)]
pub async fn save(
    State(state): State<AppState>,
    db: Database,
    Json(req): Json<SaveMediaRequest>,
) -> JsonStatusResponse<MediaPayload> {
    let now = Utc::now();
    let media_create = database::models::media::MediaCreate {
        s3_key: req.s3_key,
        mime_type: req.mime_type,
        file_size: req.file_size,
        width: req.width,
        height: req.height,
        checksum: req.checksum,
        alt_text: req.alt_text,
        description: req.description,
        credit: req.credit,
        geo_latitude: req.geo_latitude,
        geo_longitude: req.geo_longitude,
        parent_id: req.parent_id,
        derivative_type: req.derivative_type,
        gallery_type: None,
        source_id: None,
        source_system: "cms".to_string(),
        source_uri: None,
        source_updated_at: None,
        created_at: now,
        updated_at: now,
    };

    let media = db.media().insert(media_create).await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let payload = MediaPayload::from_model(media, public_url);
    payload.json_created()
}

#[utoipa::path(
    method(put),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "update_media",
    description = "Update media metadata",
    params(
        ("id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 200, description = "Success", body = MediaPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn put(
    State(state): State<AppState>,
    db: Database,
    Json(payload): Json<MediaPayload>,
) -> JsonResponse<MediaPayload> {
    let existing = db.media().by_id(payload.id).await?;
    let media = db.media().update(payload.merge_into_existing(existing)).await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    Ok(Json(MediaPayload::from_model(media, public_url)))
}

#[utoipa::path(
    method(delete),
    path = "/media/{id}",
    tag = "Media",
    operation_id = "delete_media",
    description = "Delete a media item and its S3 object",
    params(
        ("id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> StatusResponse {
    // get the media first to know the s3_key
    let media = db.media().by_id(id).await?;

    // delete from S3 if there's a key
    if let (Some(s3_config), Some(s3_client)) = (&state.config.s3, &state.s3_client) {
        let _ = s3_client
            .delete_object()
            .bucket(&s3_config.bucket)
            .key(&media.s3_key)
            .send()
            .await;
    }

    db.media().delete(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(get),
    path = "/media/entity/{entity_type}/{entity_id}",
    tag = "Media",
    operation_id = "get_entity_media",
    description = "Get all media linked to an entity",
    params(
        ("entity_type" = String, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID"),
        ("gallery_type" = Option<String>, Query, description = "Optional media gallery type filter (e.g. media, poster, review)"),
        ("cover_only" = Option<bool>, Query, description = "If true, only return cover media"),
        ("include_crops" = Option<bool>, Query, description = "If true, include imported crop variants")
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
    let media = db
        .media()
        .for_entity_filtered(
            et,
            entity_id,
            params.gallery_type.as_deref(),
            params.cover_only.unwrap_or(false),
        )
        .await?;
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let include_crops = params.include_crops.unwrap_or(false);

    let mut payloads: Vec<MediaPayload> = Vec::with_capacity(media.len());
    for m in media {
        let mut payload = MediaPayload::from_model(m, public_url);
        if include_crops {
            let variants = db.media_variants().for_media_kind(payload.id, "crop").await?;
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
    pub gallery_type: Option<String>,
    pub cover_only: Option<bool>,
    pub include_crops: Option<bool>,
}

#[utoipa::path(
    method(post),
    path = "/media/entity/{entity_type}/{entity_id}",
    tag = "Media",
    operation_id = "link_media_to_entity",
    description = "Link a media item to an entity",
    params(
        ("entity_type" = String, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    request_body = LinkMediaRequest,
    responses(
        (status = 201, description = "Linked"),
        (status = 404, description = "Not found")
    )
)]
pub async fn link_to_entity(
    db: Database,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
    Json(req): Json<LinkMediaRequest>,
) -> StatusResponse {
    let et = parse_entity_type(&entity_type)?;
    db.media()
        .link_to_entity(
            et,
            entity_id,
            req.media_id,
            req.sort_order.unwrap_or(0),
            req.is_cover_image.unwrap_or(false),
        )
        .await?;
    Ok(StatusCode::CREATED)
}

#[utoipa::path(
    method(delete),
    path = "/media/entity/{entity_type}/{entity_id}/{media_id}",
    tag = "Media",
    operation_id = "unlink_media_from_entity",
    description = "Unlink a media item from an entity. If the media has no remaining links, it will be cleaned up on the next orphan sweep.",
    params(
        ("entity_type" = String, Path, description = "Entity type (production, event, blogpost, media, artist)"),
        ("entity_id" = Uuid, Path, description = "Entity UUID"),
        ("media_id" = Uuid, Path, description = "Media UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found")
    )
)]
pub async fn unlink_from_entity(
    db: Database,
    Path((entity_type, entity_id, media_id)): Path<(String, Uuid, Uuid)>,
) -> StatusResponse {
    let et = parse_entity_type(&entity_type)?;
    db.media().unlink_from_entity(et, entity_id, media_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(post),
    path = "/media/cleanup",
    tag = "Media",
    operation_id = "cleanup_orphaned_media",
    description = "Delete orphaned media that has no entity links, and remove their S3 objects",
    responses(
        (status = 200, description = "Cleanup complete", body = CleanupResponse)
    )
)]
pub async fn cleanup_orphans(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<CleanupResponse> {
    let s3_keys = db.media().delete_orphans().await?;

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

    Ok(Json(CleanupResponse {
        deleted_count: s3_keys.len(),
        s3_keys,
    }))
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
        _ => Err(AppError::PayloadError(format!(
            "invalid entity type: {s}"
        ))),
    }
}
