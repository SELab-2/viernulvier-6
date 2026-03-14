use axum::extract::Query;
use database::Database;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    dto::facet::FacetDto,
    handlers::{IntoApiResponse, JsonResponse},
};

#[derive(Deserialize, IntoParams)]
pub struct TaxonomyParams {
    /// Filter facets by entity type (e.g. 'production', 'artist')
    pub entity_type: Option<String>,
}

#[utoipa::path(
    method(get),
    path = "/taxonomy/facets",
    tag = "Taxonomy",
    operation_id = "get_facets",
    description = "Get all facets with their tags",
    params(TaxonomyParams),
    responses(
        (status = 200, description = "Success", body = [FacetDto])
    )
)]
pub async fn get_facets(
    db: Database,
    Query(params): Query<TaxonomyParams>,
) -> JsonResponse<Vec<FacetDto>> {
    FacetDto::all(&db, params.entity_type.as_deref())
        .await?
        .json()
}
