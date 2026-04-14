use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::collection::{
        CollectionItemPayload, CollectionItemPostPayload, CollectionItemsBulkPayload,
        CollectionPayload, CollectionPostPayload,
    },
    error::{AppError, ErrorResponse},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/collections",
    tag = "Collections",
    operation_id = "get_all_collections",
    description = "Return all collections with their items. Public endpoint, no authentication required. Each collection contains the full list of its items in position order.",
    responses(
        (status = 200, description = "Success", body = [CollectionPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<CollectionPayload>> {
    CollectionPayload::all(&db).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/collections/{id}",
    tag = "Collections",
    operation_id = "get_one_collection",
    description = "Return a single collection by its UUID, including all its items in position order. Public endpoint, no authentication required. Use this to render the shareable collection page for a recipient.",
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
    method(get),
    path = "/collections/slug/{slug}",
    tag = "Collections",
    operation_id = "get_collection_by_slug",
    description = "Get a collection by slug",
    params(
        ("slug" = String, Path, description = "Collection slug")
    ),
    responses(
        (status = 200, description = "Success", body = CollectionPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one_by_slug(db: Database, Path(slug): Path<String>) -> JsonResponse<CollectionPayload> {
    CollectionPayload::by_slug(&db, &slug).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/collections",
    tag = "Collections",
    operation_id = "create_collection",
    description = "Create a new collection. Requires editor authentication. Supply a human-readable slug that will appear in the shareable URL (e.g. `videodroom-candidates-2026`) and per-language translations (title required, description required but may be empty). Items are added separately via POST /collections/{id}/items.",
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
    description = "Update the metadata (slug, titles, descriptions) of an existing collection. Requires editor authentication. Does not affect items — use the items sub-resource for that.",
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
    description = "Permanently delete a collection and all its items (cascade). Requires editor authentication. This action is irreversible and invalidates any shared URLs pointing to this collection.",
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
    description = "Add an item to a collection. Requires editor authentication. An item links a content_id (UUID of the referenced entity) and a content_type (Production, Event, Blogpost, Artist, or Location) with an optional bilingual curator comment and an explicit position for ordering.",
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
    method(put),
    path = "/collections/{id}/items",
    tag = "Collections",
    operation_id = "bulk_update_collection_items",
    description = "Replace the positions and translations of all items in a collection in one atomic call. Requires editor authentication. Send the full ordered list; positions are applied as given.",
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
pub async fn put_items(
    db: Database,
    Path(id): Path<Uuid>,
    Json(payload): Json<CollectionItemsBulkPayload>,
) -> StatusResponse {
    payload.apply(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(delete),
    path = "/collections/{id}/items/{item_id}",
    tag = "Collections",
    operation_id = "delete_collection_item",
    description = "Remove a single item from a collection. Requires editor authentication. Does not affect the other items or the collection itself.",
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
    db.collections()
        .delete_item(collection_id, item_id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(StatusCode::NO_CONTENT)
}
