use axum::{Json, extract::Path};
use database::Database;
use uuid::Uuid;

use crate::{dto::production::ProductionPayload, error::AppError};

#[utoipa::path(
    method(get),
    path = "/productions",
    tag = "Productions",
    description = "Get all productions",
    responses(
        (status = 200, description = "Success", body = [ProductionPayload])
    )
)]
pub async fn all(db: Database) -> Result<Json<Vec<ProductionPayload>>, AppError> {
    Ok(Json(ProductionPayload::all(&db, 10).await?))
}

#[utoipa::path(
    method(get),
    path = "/productions/{id}",
    tag = "Productions",
    description = "Get production by id",
    params(
        ("id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ProductionPayload)
    )
)]
pub async fn by_id(
    db: Database,
    Path(id): Path<Uuid>,
) -> Result<Json<ProductionPayload>, AppError> {
    Ok(Json(ProductionPayload::by_id(&db, id).await?))
}