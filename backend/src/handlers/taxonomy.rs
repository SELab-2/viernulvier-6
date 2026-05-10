use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use database::{Database, models::entity_type::EntityType};
use serde::Deserialize;
use slug::slugify;
use utoipa::IntoParams;

use crate::{
    dto::{
        facet::{FacetResponse, TagResponse, TagTranslationPayload},
        tag::{CreateTagRequest, TagUsageResponse, UpdateTagRequest},
    },
    error::AppError,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[derive(Deserialize, IntoParams)]
pub struct TaxonomyParams {
    /// Filter facets by entity type
    #[param(value_type = EntityType, inline, required = false)]
    pub entity_type: Option<EntityType>,
}

#[utoipa::path(
    method(get),
    path = "/taxonomy/facets",
    tag = "Taxonomy",
    operation_id = "get_facets",
    description = "Get all facets with their tags",
    params(TaxonomyParams),
    responses(
        (status = 200, description = "Success", body = [FacetResponse])
    )
)]
pub async fn get_facets(
    db: Database,
    Query(params): Query<TaxonomyParams>,
) -> JsonResponse<Vec<FacetResponse>> {
    FacetResponse::all(&db, params.entity_type).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/taxonomy/tags",
    tag = "Taxonomy",
    operation_id = "create_tag",
    description = "Create a new tag. Slug is derived server-side from the NL label.",
    request_body = CreateTagRequest,
    responses(
        (status = 201, description = "Tag created", body = TagResponse),
        (status = 409, description = "Slug already exists in this facet"),
        (status = 400, description = "Missing NL translation"),
    ),
    security(("cookie_auth" = []))
)]
pub async fn create_tag(
    db: Database,
    Json(body): Json<CreateTagRequest>,
) -> JsonStatusResponse<TagResponse> {
    let nl = body
        .translations
        .iter()
        .find(|t| t.language_code == "nl")
        .ok_or_else(|| AppError::PayloadError("NL translation is required".into()))?;

    let slug = slugify(&nl.label);
    let sort_order = db.tags().next_sort_order(body.facet).await?;
    let tag_id = db.tags().create_tag(body.facet, &slug, sort_order).await?;

    let pairs: Vec<(String, String)> = body
        .translations
        .iter()
        .map(|t| (t.language_code.clone(), t.label.clone()))
        .collect();
    db.tags().set_tag_translations(tag_id, &pairs).await?;

    TagResponse {
        slug,
        sort_order,
        translations: body
            .translations
            .iter()
            .map(|t| TagTranslationPayload {
                language_code: t.language_code.clone(),
                label: t.label.clone(),
                description: None,
            })
            .collect(),
    }
    .json_created()
}

#[utoipa::path(
    method(patch),
    path = "/taxonomy/tags/{slug}",
    tag = "Taxonomy",
    operation_id = "update_tag",
    description = "Update NL/EN labels for a tag. Slug is read-only.",
    params(("slug" = String, Path, description = "Tag slug")),
    request_body = UpdateTagRequest,
    responses(
        (status = 204, description = "Labels updated"),
        (status = 404, description = "Tag not found"),
    ),
    security(("cookie_auth" = []))
)]
pub async fn patch_tag(
    db: Database,
    Path(slug): Path<String>,
    Json(body): Json<UpdateTagRequest>,
) -> StatusResponse {
    let pairs: Vec<(String, String)> = body
        .translations
        .iter()
        .map(|t| (t.language_code.clone(), t.label.clone()))
        .collect();
    db.tags().update_tag_translations(&slug, &pairs).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize, IntoParams)]
pub struct DeleteTagParams {
    pub force: Option<bool>,
}

#[utoipa::path(
    method(delete),
    path = "/taxonomy/tags/{slug}",
    tag = "Taxonomy",
    operation_id = "delete_tag",
    description = "Delete a tag. Returns 409 with usage_count if still in use and force is not set.",
    params(
        ("slug" = String, Path, description = "Tag slug"),
        ("force" = Option<bool>, Query, description = "If true, remove all taggings and delete"),
    ),
    responses(
        (status = 204, description = "Tag deleted"),
        (status = 409, description = "Tag still in use", body = TagUsageResponse),
        (status = 404, description = "Tag not found"),
    ),
    security(("cookie_auth" = []))
)]
pub async fn delete_tag(
    db: Database,
    Path(slug): Path<String>,
    Query(params): Query<DeleteTagParams>,
) -> Result<impl IntoResponse, AppError> {
    let count = db.tags().usage_count(&slug).await?;
    if count > 0 && !params.force.unwrap_or(false) {
        return Ok((StatusCode::CONFLICT, Json(TagUsageResponse { usage_count: count }))
            .into_response());
    }
    db.tags().delete_tag(&slug).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}
