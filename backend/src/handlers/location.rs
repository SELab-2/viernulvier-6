use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::{
        location::{LocationPayload, LocationPostPayload},
        paginated::PaginatedResponse,
    },
    error::ErrorResponse,
    handlers::{
        IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse,
        helpers::pagination_query::PaginationQuery,
    },
};

#[utoipa::path(
    method(get),
    path = "/locations",
    tag = "Locations",
    operation_id = "get_all_locations",
    description = "Get all locations",
    params(
        PaginationQuery
    ),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<LocationPayload>)
    )
)]
pub async fn get_all(
    db: Database,
    Query(pagination): Query<PaginationQuery>,
) -> JsonResponse<PaginatedResponse<LocationPayload>> {
    LocationPayload::all(&db, pagination.cursor, pagination.limit)
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
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<LocationPayload> {
    LocationPayload::by_id(&db, id).await?.json()
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
