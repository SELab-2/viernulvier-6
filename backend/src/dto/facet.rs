use std::collections::HashMap;

use database::{Database, models::tag::TagWithFacet};
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
    pub sort_order: i32,
    pub tags: Vec<TagResponse>,
}

impl FacetResponse {
    pub async fn all(db: &Database, entity_type: Option<&str>) -> Result<Vec<Self>, AppError> {
        let rows = match entity_type {
            Some(et) => db.tags().with_facets_for_entity(et).await?,
            None => db.tags().with_facets().await?,
        };
        Ok(group_into_facets(rows))
    }
}

fn group_into_facets(rows: Vec<TagWithFacet>) -> Vec<FacetResponse> {
    let mut map: HashMap<String, FacetResponse> = HashMap::new();

    for row in rows {
        map.entry(row.facet_slug.clone())
            .or_insert_with(|| FacetResponse {
                slug: row.facet_slug,
                label: row.facet_label,
                sort_order: row.facet_sort_order,
                tags: Vec::new(),
            })
            .tags
            .push(TagResponse {
                slug: row.tag_slug,
                label: row.tag_label,
                sort_order: row.tag_sort_order,
            });
    }

    let mut facets: Vec<FacetResponse> = map.into_values().collect();
    facets.sort_by_key(|f| f.sort_order);
    facets
}
