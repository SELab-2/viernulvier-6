use database::{
    Database,
    models::{entity_type::EntityType, tag::TaxonomyRow},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Serialize, Deserialize, ToSchema, Clone)]
pub struct TagTranslationPayload {
    pub language_code: String,
    pub label: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema, Clone)]
pub struct FacetTranslationPayload {
    pub language_code: String,
    pub label: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct TagResponse {
    pub slug: String,
    pub sort_order: i32,
    pub translations: Vec<TagTranslationPayload>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct FacetResponse {
    pub slug: String,
    pub translations: Vec<FacetTranslationPayload>,
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

#[allow(clippy::single_match_else)]
fn group_into_facets(rows: Vec<TaxonomyRow>) -> Vec<FacetResponse> {
    let mut facets: Vec<FacetResponse> = Vec::new();

    for row in rows {
        let facet = match facets.iter_mut().find(|f| f.slug == row.facet_slug) {
            Some(f) => f,
            None => {
                facets.push(FacetResponse {
                    slug: row.facet_slug.clone(),
                    translations: Vec::new(),
                    tags: Vec::new(),
                });
                facets.last_mut().unwrap()
            }
        };

        // Only the first occurrence per language wins
        if !facet
            .translations
            .iter()
            .any(|t| t.language_code == row.language_code)
        {
            facet.translations.push(FacetTranslationPayload {
                language_code: row.language_code.clone(),
                label: row.facet_label.clone(),
            });
        }

        let tag = match facet.tags.iter_mut().find(|t| t.slug == row.tag_slug) {
            Some(t) => t,
            None => {
                facet.tags.push(TagResponse {
                    slug: row.tag_slug.clone(),
                    sort_order: row.tag_sort_order,
                    translations: Vec::new(),
                });
                facet.tags.last_mut().unwrap()
            }
        };

        tag.translations.push(TagTranslationPayload {
            language_code: row.language_code,
            label: row.tag_label,
            description: row.tag_description,
        });
    }

    facets
}
