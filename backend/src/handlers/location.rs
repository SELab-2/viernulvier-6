use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::location::{LocationPayload, LocationPostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/locations",
    tag = "Locations",
    description = "Get all locations",
    responses(
        (status = 200, description = "Success", body = [LocationPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<LocationPayload>> {
    LocationPayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/locations/{id}",
    tag = "Locations",
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
    description = "Create a location",
    responses(
        (status = 201, description = "Created", body = LocationPayload)
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
    description = "Delete a location",
    params(
            ("id" = Uuid, Path, description = "Location UUID")
        ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found")
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
    description = "Update the fields of a location",
    responses(
        (status = 200, description = "Success", body = LocationPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn put(db: Database, Json(location): Json<LocationPayload>) -> JsonResponse<LocationPayload> {
    Ok(Json(location.update(&db).await?))
}
