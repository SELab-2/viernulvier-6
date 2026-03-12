use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::production::{ProductionPayload, ProductionPostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/productions",
    tag = "Productions",
    operation_id = "get_all_productions",
    description = "Get all productions",
    responses(
        (status = 200, description = "Success", body = [ProductionPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<ProductionPayload>> {
    ProductionPayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/productions/{id}",
    tag = "Productions",
    operation_id = "get_one_production",
    description = "Get a production by id",
    params(
        ("id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ProductionPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<ProductionPayload> {
    ProductionPayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/productions",
    tag = "Productions",
    operation_id = "create_production",
    description = "Create a production",
    responses(
        (status = 201, description = "Created", body = ProductionPayload)
    )
)]
pub async fn post(
    db: Database,
    Json(production): Json<ProductionPostPayload>,
) -> JsonStatusResponse<ProductionPayload> {
    production.create(&db).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/productions/{id}",
    tag = "Productions",
    operation_id = "delete_production",
    description = "Delete a production",
    params(
            ("id" = Uuid, Path, description = "Production UUID")
        ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> StatusResponse {
    ProductionPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/productions",
    tag = "Productions",
    operation_id = "update_production",
    description = "Update the fields of a production",
    responses(
        (status = 200, description = "Success", body = ProductionPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn put(
    db: Database,
    Json(production): Json<ProductionPayload>,
) -> JsonResponse<ProductionPayload> {
    Ok(Json(production.update(&db).await?))
}
