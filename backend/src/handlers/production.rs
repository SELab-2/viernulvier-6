use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use database::Database;
use uuid::Uuid;

use crate::{
    AppState,
    dto::{
        event::EventPayload,
        paginated::PaginatedResponse,
        production::{ProductionPayload, ProductionPostPayload},
    },
    error::ErrorResponse,
    handlers::{
        IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse,
        queries::{pagination::PaginationQuery, production::ProductionSearchQuery},
    },
};

#[utoipa::path(
    method(get),
    path = "/productions",
    tag = "Productions",
    operation_id = "get_all_productions",
    description = "Get all productions",
    params(
        PaginationQuery,
        ProductionSearchQuery
    ),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<ProductionPayload>)
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
    Query(pagination): Query<PaginationQuery>,
    Query(search): Query<ProductionSearchQuery>,
) -> JsonResponse<PaginatedResponse<ProductionPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());

    ProductionPayload::all(&db, pagination.cursor, pagination.limit, public_url, search)
        .await?
        .json()
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
pub async fn get_one(
    State(state): State<AppState>,
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<ProductionPayload> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    let payload = ProductionPayload::by_id(&db, id, public_url).await?;

    payload.json()
}

#[utoipa::path(
    method(get),
    path = "/productions/slug/{slug}",
    tag = "Productions",
    operation_id = "get_production_by_slug",
    description = "Get a production by slug",
    params(
        ("slug" = String, Path, description = "Production slug")
    ),
    responses(
        (status = 200, description = "Success", body = ProductionPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one_by_slug(db: Database, Path(slug): Path<String>) -> JsonResponse<ProductionPayload> {
    ProductionPayload::by_slug(&db, &slug).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/productions/{id}/events",
    tag = "Productions",
    operation_id = "get_events_by_production_id",
    description = "Get all events for a production",
    params(
        ("id" = Uuid, Path, description = "Production UUID")
    ),
    responses(
        (status = 200, description = "Success", body = [EventPayload]),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_events(db: Database, Path(id): Path<Uuid>) -> JsonResponse<Vec<EventPayload>> {
    EventPayload::by_production(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/productions",
    tag = "Productions",
    operation_id = "create_production",
    description = "Create a production",
    responses(
        (status = 201, description = "Created", body = ProductionPayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
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
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
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
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn put(
    db: Database,
    Json(production): Json<ProductionPayload>,
) -> JsonResponse<ProductionPayload> {
    Ok(Json(production.update(&db).await?))
}
