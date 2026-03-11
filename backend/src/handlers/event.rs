use axum::{Json, extract::Path, http::StatusCode};
use database::Database;
use uuid::Uuid;

use crate::{
    dto::event::EventPayload,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[utoipa::path(
    method(get),
    path = "/events",
    tag = "Events",
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