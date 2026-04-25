use axum::extract::State;
use axum::extract::Path;
use axum::Json;
use axum::http::StatusCode;
use database::Database;
use uuid::Uuid;

use crate::{
    AppState,
    dto::{artist::{ArtistPayload, ArtistPostPayload, ArtistUpdatePayload}, production::ProductionPayload},
    error::ErrorResponse,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/artists",
    tag = "Artists",
    operation_id = "get_all_artists",
    description = "Get all artists",
    responses(
        (status = 200, description = "Success", body = [ArtistPayload])
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<Vec<ArtistPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    ArtistPayload::all(&db, public_url).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/artists/{id}",
    tag = "Artists",
    operation_id = "get_one_artist",
    description = "Get an artist by id",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArtistPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<ArtistPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    ArtistPayload::by_id(&db, id, public_url).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/artists/{id}/productions",
    tag = "Artists",
    operation_id = "get_productions_by_artist_id",
    description = "Get all productions for an artist",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 200, description = "Success", body = [ProductionPayload]),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_productions(
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<Vec<ProductionPayload>> {
    ArtistPayload::productions(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/artists/cms",
    tag = "Artists",
    operation_id = "create_artist",
    description = "Create a new artist — editor only",
    responses(
        (status = 201, description = "Created", body = ArtistPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn post(
    State(state): State<AppState>,
    db: Database,
    Json(payload): Json<ArtistPostPayload>,
) -> JsonStatusResponse<ArtistPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    payload.create(&db, public_url).await?.json_created()
}

#[utoipa::path(
    method(put),
    path = "/artists/cms/{id}",
    tag = "Artists",
    operation_id = "update_artist",
    description = "Update an artist — editor only",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArtistPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn put(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
    Json(payload): Json<ArtistUpdatePayload>,
) -> JsonResponse<ArtistPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    payload.update(&db, id, public_url).await?.json()
}

#[utoipa::path(
    method(delete),
    path = "/artists/cms/{id}",
    tag = "Artists",
    operation_id = "delete_artist",
    description = "Delete an artist — editor only",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> StatusResponse {
    ArtistPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
