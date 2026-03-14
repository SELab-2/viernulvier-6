use database::{Database, models::tag::TagWithFacet};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Serialize, ToSchema)]
pub struct TagDto {
    pub slug: String,
    pub label: String,
}

#[derive(Serialize, ToSchema)]
pub struct FacetDto {
    pub slug: String,
    pub label: String,
    pub tags: Vec<TagDto>,
}

impl FacetDto {
    pub async fn all(db: &Database, entity_type: Option<&str>) -> Result<Vec<Self>, AppError> {
        let rows = db.tags().facets(entity_type).await?;
        Ok(group_into_facets(rows))
    }
}

fn group_into_facets(rows: Vec<TagWithFacet>) -> Vec<FacetDto> {
    let mut facets: Vec<FacetDto> = Vec::new();

    for row in rows {
        match facets.iter_mut().find(|f| f.slug == row.facet_slug) {
            Some(facet) => facet.tags.push(TagDto {
                slug: row.tag_slug,
                label: row.tag_label,
            }),
            None => facets.push(FacetDto {
                slug: row.facet_slug,
                label: row.facet_label,
                tags: vec![TagDto {
                    slug: row.tag_slug,
                    label: row.tag_label,
                }],
            }),
        }
    }

    facets
}
