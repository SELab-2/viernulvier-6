use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::production::{ProductionPayload, ProductionPostPayload},
    error::AppError,
};

#[utoipa::path(
    method(get),
    path = "/productions",
    tag = "Productions",
    description = "Get all productions",
    responses(
        (status = 200, description = "Success", body = [ProductionPayload])
    )
)]
pub async fn get_all(db: Database) -> Result<Json<Vec<ProductionPayload>>, AppError> {
    Ok(Json(ProductionPayload::all(&db, 10).await?))
}

#[utoipa::path(
    method(get),
    path = "/productions/{id}",
    tag = "Productions",
    description = "Get a production by id",
    params(
        ("id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ProductionPayload)
    )
)]
pub async fn get_one(
    db: Database,
    Path(id): Path<Uuid>,
) -> Result<Json<ProductionPayload>, AppError> {
    Ok(Json(ProductionPayload::by_id(&db, id).await?))
}

#[utoipa::path(
    method(post),
    path = "/productions",
    tag = "Productions",
    description = "Create a production",
    responses(
        (status = 200, description = "Success", body = ProductionPayload)
    )
)]
pub async fn post(
    db: Database,
    Json(production): Json<ProductionPostPayload>,
) -> Result<Json<ProductionPayload>, AppError> {
    Ok(Json(production.create(&db).await?))
}

#[utoipa::path(
    method(delete),
    path = "/productions/{id}",
    tag = "Productions",
    description = "Delete a production",
    params(
            ("id" = Uuid, Path, description = "Production UUID")
        ),
    responses(
        (status = 204, description = "No Content")
    )
)]
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    ProductionPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/productions",
    tag = "Productions",
    description = "Update the fields of a production",
    responses(
        (status = 200, description = "Success", body = ProductionPayload)
    )
)]
pub async fn put(
    db: Database,
    Json(production): Json<ProductionPayload>,
) -> Result<Json<ProductionPayload>, AppError> {
    Ok(Json(production.update(&db).await?))
}
