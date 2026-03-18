use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    error::ErrorResponse,
    dto::hall::{HallPayload, HallPostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
    extractors::auth::{RequireAdmin},
};

#[utoipa::path(
    method(get),
    path = "/halls",
    tag = "Halls",
    operation_id = "get_all_halls",
    description = "Get all halls",
    responses(
        (status = 200, description = "Success", body = [HallPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<HallPayload>> {
    HallPayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/halls/{id}",
    tag = "Halls",
    operation_id = "get_one_hall",
    description = "Get a hall by id",
    params(
        ("id" = Uuid, Path, description = "Hall UUID")
    ),
    responses(
        (status = 200, description = "Success", body = HallPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<HallPayload> {
    HallPayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/halls",
    tag = "Halls",
    operation_id = "create_hall",
    description = "Create a hall",
    responses(
        (status = 201, description = "Created", body = HallPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    _admin: RequireAdmin,
    db: Database,
    Json(hall): Json<HallPostPayload>,
) -> JsonStatusResponse<HallPayload> {
    hall.create(&db).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/halls/{id}",
    tag = "Halls",
    operation_id = "delete_hall",
    description = "Delete a hall",
    params(
            ("id" = Uuid, Path, description = "Hall UUID")
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
pub async fn delete(
    _admin: RequireAdmin,
    db: Database,
    Path(id): Path<Uuid>
) -> StatusResponse {
    HallPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/halls",
    tag = "Halls",
    operation_id = "update_hall",
    description = "Update the fields of a hall",
    responses(
        (status = 200, description = "Success", body = HallPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(
    _admin: RequireAdmin,
    db: Database,
    Json(hall): Json<HallPayload>
) -> JsonResponse<HallPayload> {
    Ok(Json(hall.update(&db).await?))
}
