use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::collection::{
        CollectionItemPayload, CollectionItemPostPayload, CollectionPayload, CollectionPostPayload,
    },
    error::ErrorResponse,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/collections",
    tag = "Collections",
    operation_id = "get_all_collections",
    description = "Get all collections",
    responses(
        (status = 200, description = "Success", body = [CollectionPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<CollectionPayload>> {
    // TODO: hard-coded limit of 10 will silently truncate results once there are >10 collections; add pagination
    CollectionPayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/collections/{id}",
    tag = "Collections",
    operation_id = "get_one_collection",
    description = "Get collection by id",
    params(
        ("id" = Uuid, Path, description = "Collection UUID")
    ),
    responses(
        (status = 200, description = "Success", body = CollectionPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<CollectionPayload> {
    CollectionPayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/collections",
    tag = "Collections",
    operation_id = "create_collection",
    description = "Create a collection",
    responses(
        (status = 201, description = "Created", body = CollectionPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    db: Database,
    Json(collection): Json<CollectionPostPayload>,
) -> JsonStatusResponse<CollectionPayload> {
    collection.create(&db).await?.json_created()
}

#[utoipa::path(
    method(put),
    path = "/collections",
    tag = "Collections",
    operation_id = "update_collection",
    description = "Update the fields of a collection",
    responses(
        (status = 200, description = "Success", body = CollectionPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(
    db: Database,
    Json(collection): Json<CollectionPayload>,
) -> JsonResponse<CollectionPayload> {
    collection.update(&db).await?.json()
}

#[utoipa::path(
    method(delete),
    path = "/collections/{id}",
    tag = "Collections",
    operation_id = "delete_collection",
    description = "Delete a collection",
    params(
        ("id" = Uuid, Path, description = "Collection UUID")
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
    CollectionPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(post),
    path = "/collections/{id}/items",
    tag = "Collections",
    operation_id = "add_collection_item",
    description = "Add an item to a collection",
    params(
        ("id" = Uuid, Path, description = "Collection UUID")
    ),
    responses(
        (status = 201, description = "Created", body = CollectionItemPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post_item(
    db: Database,
    Path(id): Path<Uuid>,
    Json(item): Json<CollectionItemPostPayload>,
) -> JsonStatusResponse<CollectionItemPayload> {
    item.add_to(&db, id).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/collections/{id}/items/{item_id}",
    tag = "Collections",
    operation_id = "delete_collection_item",
    description = "Remove an item from a collection",
    params(
        ("id" = Uuid, Path, description = "Collection UUID"),
        ("item_id" = Uuid, Path, description = "Collection item UUID")
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
pub async fn delete_item(
    db: Database,
    Path((collection_id, item_id)): Path<(Uuid, Uuid)>,
) -> StatusResponse {
    db.collections().delete_item(collection_id, item_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
