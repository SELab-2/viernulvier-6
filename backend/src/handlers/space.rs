
use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    error::ErrorResponse,
    dto::space::{SpacePayload, SpacePostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
    extractors::auth::RequireAdmin,
};

#[utoipa::path(
    method(get),
    path = "/spaces",
    tag = "Spaces",
    operation_id = "get_all_spaces",
    description = "Get all spaces",
    responses(
        (status = 200, description = "Success", body = [SpacePayload])
    )
)]
pub async fn get_all(
    db: Database
) -> JsonResponse<Vec<SpacePayload>> {
    SpacePayload::all(&db, 10).await?.json()
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
pub async fn get_one(
    db: Database,
    Path(id): Path<Uuid>
) -> JsonResponse<SpacePayload> {
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
    _admin: RequireAdmin,
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
pub async fn delete(
    _admin: RequireAdmin,
    db: Database,
    Path(id): Path<Uuid>
) -> StatusResponse {
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
pub async fn put(
    _admin: RequireAdmin,
    db: Database,
    Json(space): Json<SpacePayload>
) -> JsonResponse<SpacePayload> {
    Ok(Json(space.update(&db).await?))
}

