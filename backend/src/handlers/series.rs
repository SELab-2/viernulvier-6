use axum::{Json, extract::{Path, State}, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    AppState,
    dto::series::{SeriesPayload, SeriesPostPayload, SeriesProductionsPayload},
    error::{AppError, ErrorResponse},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/series",
    tag = "Series",
    operation_id = "get_all_series",
    description = "Return all series with translations, production IDs, and derived period. Public endpoint, no authentication required.",
    responses(
        (status = 200, description = "Success", body = [SeriesPayload])
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<Vec<SeriesPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    SeriesPayload::all(&db, public_url).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/series/{slug}",
    tag = "Series",
    operation_id = "get_one_series",
    description = "Return a single series by its slug, including translations, production IDs, and derived period. Public endpoint, no authentication required.",
    params(
        ("slug" = String, Path, description = "Series slug")
    ),
    responses(
        (status = 200, description = "Success", body = SeriesPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(
    State(state): State<AppState>,
    db: Database,
    Path(slug): Path<String>,
) -> JsonResponse<SeriesPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    SeriesPayload::by_slug(&db, &slug, public_url).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/productions/{id}/series",
    tag = "Series",
    operation_id = "get_series_for_production",
    description = "Return all series that contain the given production. Public endpoint, no authentication required.",
    params(
        ("id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 200, description = "Success", body = [SeriesPayload])
    )
)]
pub async fn get_for_production(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<Vec<SeriesPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    SeriesPayload::for_production(&db, id, public_url).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/series",
    tag = "Series",
    operation_id = "create_series",
    description = "Create a new series. Requires editor authentication. Supply a slug and per-language translations (name, subtitle, description). Productions are added separately via POST /series/{slug}/productions.",
    responses(
        (status = 201, description = "Created", body = SeriesPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    db: Database,
    Json(series): Json<SeriesPostPayload>,
) -> JsonStatusResponse<SeriesPayload> {
    series.create(&db).await?.json_created()
}

#[utoipa::path(
    method(put),
    path = "/series",
    tag = "Series",
    operation_id = "update_series",
    description = "Update the metadata (slug, translations) of an existing series. Requires editor authentication. Does not affect production membership.",
    responses(
        (status = 200, description = "Success", body = SeriesPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(
    State(state): State<AppState>,
    db: Database,
    Json(series): Json<SeriesPayload>,
) -> JsonResponse<SeriesPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    series.update(&db, public_url).await?.json()
}

#[utoipa::path(
    method(delete),
    path = "/series/{slug}",
    tag = "Series",
    operation_id = "delete_series",
    description = "Permanently delete a series. Requires editor authentication. Productions are not affected.",
    params(
        ("slug" = String, Path, description = "Series slug")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn delete(db: Database, Path(slug): Path<String>) -> StatusResponse {
    SeriesPayload::delete(&db, &slug).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(post),
    path = "/series/{slug}/productions",
    tag = "Series",
    operation_id = "add_productions_to_series",
    description = "Add one or more productions to a series. Requires editor authentication. Duplicates are silently ignored.",
    params(
        ("slug" = String, Path, description = "Series slug")
    ),
    responses(
        (status = 200, description = "Success", body = SeriesPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn add_productions(
    State(state): State<AppState>,
    db: Database,
    Path(slug): Path<String>,
    Json(payload): Json<SeriesProductionsPayload>,
) -> JsonResponse<SeriesPayload> {
    let swt = db
        .series()
        .by_slug(&slug)
        .await?
        .ok_or(AppError::NotFound)?;

    db.series()
        .add_productions(swt.series.id, &payload.production_ids)
        .await?;

    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    SeriesPayload::by_slug(&db, &slug, public_url).await?.json()
}

#[utoipa::path(
    method(delete),
    path = "/series/{slug}/productions/{production_id}",
    tag = "Series",
    operation_id = "remove_production_from_series",
    description = "Remove a production from a series. Requires editor authentication. The production itself is not deleted.",
    params(
        ("slug" = String, Path, description = "Series slug"),
        ("production_id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn remove_production(
    db: Database,
    Path((slug, production_id)): Path<(String, Uuid)>,
) -> StatusResponse {
    let swt = db
        .series()
        .by_slug(&slug)
        .await?
        .ok_or(AppError::NotFound)?;

    db.series()
        .remove_production(swt.series.id, production_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(StatusCode::NO_CONTENT)
}
