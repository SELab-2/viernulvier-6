use axum::{Json, extract::Path};
use database::{Database, models::entity_type::EntityType};
use uuid::Uuid;

use crate::{
    dto::facet::{EntityFacetResponse, ReplaceTagsRequest},
    error::AppError,
    handlers::JsonResponse,
};

const TAGGABLE: [EntityType; 4] = [
    EntityType::Production,
    EntityType::Artist,
    EntityType::Article,
    EntityType::Media,
];

fn require_taggable(et: EntityType) -> Result<(), AppError> {
    if TAGGABLE.contains(&et) {
        Ok(())
    } else {
        Err(AppError::PayloadError(format!(
            "{et:?} does not support tagging"
        )))
    }
}

#[utoipa::path(
    method(get),
    path = "/tags/{entity_type}/{entity_id}",
    tag = "Tags",
    operation_id = "get_entity_tags",
    description = "Get all tags on an entity, grouped by facet",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    responses(
        (status = 200, description = "Success", body = [EntityFacetResponse]),
        (status = 400, description = "Entity type does not support tagging")
    )
)]
pub async fn get_tags(
    db: Database,
    Path((entity_type, entity_id)): Path<(EntityType, Uuid)>,
) -> JsonResponse<Vec<EntityFacetResponse>> {
    require_taggable(entity_type)?;
    let jsonb = db.tags().entity_facets(entity_type, entity_id).await?;
    Ok(Json(EntityFacetResponse::from_jsonb(jsonb)?))
}

#[utoipa::path(
    method(put),
    path = "/tags/{entity_type}/{entity_id}",
    tag = "Tags",
    operation_id = "replace_entity_tags",
    description = "Replace all tags on an entity",
    params(
        ("entity_type" = EntityType, Path, description = "Entity type"),
        ("entity_id" = Uuid, Path, description = "Entity UUID")
    ),
    request_body = ReplaceTagsRequest,
    responses(
        (status = 200, description = "Success", body = [EntityFacetResponse]),
        (status = 400, description = "Invalid tag slug or non-taggable entity type"),
        (status = 404, description = "Entity not found"),
        (status = 401, description = "Unauthorized", body = crate::error::ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn put_tags(
    db: Database,
    Path((entity_type, entity_id)): Path<(EntityType, Uuid)>,
    Json(body): Json<ReplaceTagsRequest>,
) -> JsonResponse<Vec<EntityFacetResponse>> {
    require_taggable(entity_type)?;
    let jsonb = db
        .tags()
        .replace_tags(entity_type, entity_id, &body.tag_slugs)
        .await?;
    Ok(Json(EntityFacetResponse::from_jsonb(jsonb)?))
}
