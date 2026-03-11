
use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::space::{SpacePayload, SpacePostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/spaces",
    tag = "Spaces",
    description = "Create a space",
    responses(
        (status = 201, description = "Created", body = [SpacePayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<SpacePayload>> {
    SpacePayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/spaces/{id}",
    tag = "Spaces",
    description = "Get a space by id",
    params(
        ("id" = Uuid, Path, description = "Space UUID")
    ),
    responses(
        (status = 200, description = "Success", body = SpacePayload)
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<SpacePayload> {
    SpacePayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/spaces",
    tag = "Spaces",
    description = "Create a space",
    responses(
        (status = 201, description = "Created", body = SpacePayload)
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
    description = "Delete a space",
    params(
            ("id" = Uuid, Path, description = "Space UUID")
        ),
    responses(
        (status = 204, description = "No Content")
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
    description = "Update the fields of a space",
    responses(
        (status = 200, description = "Success", body = SpacePayload)
    )
)]
pub async fn put(db: Database, Json(space): Json<SpacePayload>) -> JsonResponse<SpacePayload> {
    Ok(Json(space.update(&db).await?))
}

