use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::event::{EventPayload, EventPostPayload},
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/events",
    tag = "Events",
    operation_id = "get_all_events",
    description = "Get all events",
    responses(
        (status = 200, description = "Success", body = [EventPayload])
    )
)]
pub async fn get_all(db: Database) -> JsonResponse<Vec<EventPayload>> {
    EventPayload::all(&db, 10).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/events/{id}",
    tag = "Events",
    operation_id = "get_event_by_id",
    description = "Get an event by id",
    params(
        ("id" = Uuid, Path, description = "Event UUID")
    ),
    responses(
        (status = 200, description = "Success", body = EventPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<EventPayload> {
    EventPayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/events",
    tag = "Events",
    operation_id = "create_event",
    description = "Create an event",
    responses(
        (status = 201, description = "Created", body = EventPayload)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn post(
    db: Database,
    Json(event): Json<EventPostPayload>,
) -> JsonStatusResponse<EventPayload> {
    event.create(&db).await?.json_created()
}

#[utoipa::path(
    method(delete),
    path = "/events/{id}",
    tag = "Events",
    operation_id = "delete_event",
    description = "Delete an event",
    params(
        ("id" = Uuid, Path, description = "Event UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found")
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> StatusResponse {
    EventPayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(put),
    path = "/events",
    tag = "Events",
    operation_id = "update_event",
    description = "Update an event",
    responses(
        (status = 200, description = "Success", body = EventPayload),
        (status = 404, description = "Not found")
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(db: Database, Json(event): Json<EventPayload>) -> JsonResponse<EventPayload> {
    Ok(Json(event.update(&db).await?))
}