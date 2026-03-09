use axum::{Json, extract::Path};
use database::Database;
use uuid::Uuid;

use crate::{dto::location::LocationPayload, error::AppError};

#[utoipa::path(
    method(get),
    path = "/locations",
    tag = "Locations",
    description = "Get all locations",
    responses(
        (status = 200, description = "Success", body = [LocationPayload])
    )
)]
pub async fn all(db: Database) -> Result<Json<Vec<LocationPayload>>, AppError> {
    Ok(Json(LocationPayload::all(&db, 10).await?))
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
pub async fn by_id(
    db: Database,
    Path(id): Path<Uuid>,
) -> Result<Json<LocationPayload>, AppError> {
    Ok(Json(LocationPayload::by_id(&db, id).await?))
}