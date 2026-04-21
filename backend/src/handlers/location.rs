use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use database::Database;
use uuid::Uuid;

use crate::{
    AppState,
    dto::{
        location::{LocationPayload, LocationPostPayload},
        paginated::PaginatedResponse,
    },
    error::ErrorResponse,
    handlers::{
        IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse,
        queries::{location::LocationSearchQuery, pagination::PaginationQuery},
    },
};

#[utoipa::path(
    method(get),
    path = "/locations",
    tag = "Locations",
    operation_id = "get_all_locations",
    description = "Get all locations",
    params(
        PaginationQuery,
        LocationSearchQuery
    ),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<LocationPayload>)
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
    Query(pagination): Query<PaginationQuery>,
    Query(search): Query<LocationSearchQuery>,
) -> JsonResponse<PaginatedResponse<LocationPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    LocationPayload::all(&db, pagination.cursor, pagination.limit, public_url, search)
        .await?
        .json()
}

#[utoipa::path(
    method(get),
    path = "/locations/{id}",
    tag = "Locations",
    operation_id = "get_one_location",
    description = "Get location by id",
    params(
        ("id" = Uuid, Path, description = "Location UUID")
    ),
    responses(
        (status = 200, description = "Success", body = LocationPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<LocationPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    LocationPayload::by_id(&db, id, public_url).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/locations/slug/{slug}",
    tag = "Locations",
    operation_id = "get_location_by_slug",
    description = "Get location by slug",
    params(
        ("slug" = String, Path, description = "Location slug")
    ),
    responses(
        (status = 200, description = "Success", body = LocationPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_by_slug(
    State(state): State<AppState>,
    db: Database,
    Path(slug): Path<String>,
) -> JsonResponse<LocationPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    LocationPayload::by_slug(&db, &slug, public_url)
        .await?
        .json()
}

#[utoipa::path(
    method(post),
    path = "/locations",
    tag = "Locations",
    operation_id = "create_location",
    description = "Create a location",
    responses(
        (status = 201, description = "Created", body = LocationPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    db: Database,
    Json(location): Json<LocationPostPayload>,
) -> JsonStatusResponse<LocationPayload> {
    location.create(&db).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/locations/{id}",
    tag = "Locations",
    operation_id = "delete_location",
    description = "Delete a location",
    params(
            ("id" = Uuid, Path, description = "Location UUID")
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
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> StatusResponse {
    LocationPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/locations",
    tag = "Locations",
    operation_id = "update_location",
    description = "Update the fields of a location",
    responses(
        (status = 200, description = "Success", body = LocationPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(
    db: Database,
    Json(location): Json<LocationPayload>,
) -> JsonResponse<LocationPayload> {
    Ok(Json(location.update(&db).await?))
}
