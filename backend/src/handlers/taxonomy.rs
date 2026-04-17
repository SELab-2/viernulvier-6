use axum::extract::Query;
use database::{Database, models::entity_type::EntityType};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    dto::facet::FacetResponse,
    handlers::{IntoApiResponse, JsonResponse},
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
