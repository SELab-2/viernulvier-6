use database::{
    Database,
    models::{entity_type::EntityType, tag::TaxonomyTag},
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Serialize, ToSchema)]
pub struct TagResponse {
    pub slug: String,
    pub label: String,
    pub sort_order: i32,
}

#[derive(Serialize, ToSchema)]
pub struct FacetResponse {
    pub slug: String,
    pub label: String,
    pub tags: Vec<TagResponse>,
}

impl FacetResponse {
    pub async fn all(
        db: &Database,
        entity_type: Option<EntityType>,
    ) -> Result<Vec<Self>, AppError> {
        let rows = match entity_type {
            Some(et) => db.tags().with_facets_for_entity(et).await?,
            None => db.tags().with_facets().await?,
        };
        Ok(group_into_facets(rows))
    }
}

fn group_into_facets(rows: Vec<TaxonomyTag>) -> Vec<FacetResponse> {
    let mut facets: Vec<FacetResponse> = Vec::new();

    for row in rows {
        let tag = TagResponse {
            slug: row.tag_slug,
            label: row.tag_label,
            sort_order: row.tag_sort_order,
        };
        match facets.iter_mut().find(|f| f.slug == row.facet_slug) {
            Some(f) => f.tags.push(tag),
            None => facets.push(FacetResponse {
                slug: row.facet_slug,
                label: row.facet_label,
                tags: vec![tag],
            }),
        }
    }

    facets
}
