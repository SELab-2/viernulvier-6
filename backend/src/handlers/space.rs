use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::{
        paginated::PaginatedResponse,
        space::{SpacePayload, SpacePostPayload},
    },
    error::ErrorResponse,
    handlers::{
        IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse,
        queries::pagination::PaginationQuery,
    },
};

#[utoipa::path(
    method(get),
    path = "/spaces",
    tag = "Spaces",
    operation_id = "get_all_spaces",
    description = "Get all spaces",
    params(
        PaginationQuery
    ),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<SpacePayload>)
    )
)]
pub async fn get_all(
    db: Database,
    Query(pagination): Query<PaginationQuery>,
) -> JsonResponse<PaginatedResponse<SpacePayload>> {
    SpacePayload::all(&db, pagination.cursor, pagination.limit)
        .await?
        .json()
}

#[utoipa::path(
    method(get),
    path = "/spaces/{id}",
    tag = "Spaces",
    operation_id = "get_one_space",
    description = "Get a space by id",
    params(
        ("id" = Uuid, Path, description = "Space UUID")
    ),
    responses(
        (status = 200, description = "Success", body = SpacePayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<SpacePayload> {
    SpacePayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/spaces",
    tag = "Spaces",
    operation_id = "create_space",
    description = "Create a space",
    responses(
        (status = 201, description = "Created", body = SpacePayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    db: Database,
    Json(space): Json<SpacePostPayload>,
) -> JsonStatusResponse<SpacePayload> {
    space.create(&db).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/spaces/{id}",
    tag = "Spaces",
    operation_id = "delete_space",
    description = "Delete a space",
    params(
            ("id" = Uuid, Path, description = "Space UUID")
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
    SpacePayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/spaces",
    tag = "Spaces",
    operation_id = "update_space",
    description = "Update the fields of a space",
    responses(
        (status = 200, description = "Success", body = SpacePayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(db: Database, Json(space): Json<SpacePayload>) -> JsonResponse<SpacePayload> {
    Ok(Json(space.update(&db).await?))
}
