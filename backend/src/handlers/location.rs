use axum::extract::Path;
use database::Database;
use uuid::Uuid;

use crate::{
    dto::location::LocationPayload,
    handlers::{IntoApiResponse, JsonResponse},
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
pub async fn all(db: Database) -> JsonResponse<Vec<LocationPayload>> {
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
        (status = 200, description = "Success", body = LocationPayload)
    )
)]
pub async fn by_id(db: Database, Path(id): Path<Uuid>) -> JsonResponse<LocationPayload> {
    LocationPayload::by_id(&db, id).await?.json()
}
