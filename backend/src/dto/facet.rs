use std::collections::HashMap;

use database::{
    Database,
    models::{entity_type::EntityType, tag::TaxonomyRow},
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Serialize, ToSchema, Clone)]
pub struct TagTranslationPayload {
    pub label: String,
    pub description: Option<String>,
}

#[derive(Serialize, ToSchema, Clone)]
pub struct FacetTranslationPayload {
    pub label: String,
}

#[derive(Serialize, ToSchema)]
pub struct TagResponse {
    pub slug: String,
    pub sort_order: i32,
    #[schema(additional_properties)]
    pub translations: HashMap<String, TagTranslationPayload>,
}

#[derive(Serialize, ToSchema)]
pub struct FacetResponse {
    pub slug: String,
    #[schema(additional_properties)]
    pub translations: HashMap<String, FacetTranslationPayload>,
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

fn group_into_facets(rows: Vec<TaxonomyRow>) -> Vec<FacetResponse> {
    let mut facets: Vec<FacetResponse> = Vec::new();

    for row in rows {
        // Find or create the facet entry
        let facet = match facets.iter_mut().find(|f| f.slug == row.facet_slug) {
            Some(f) => f,
            None => {
                facets.push(FacetResponse {
                    slug: row.facet_slug.clone(),
                    translations: HashMap::new(),
                    tags: Vec::new(),
                });
                facets.last_mut().unwrap()
            }
        };

        // Add this language's facet label (only the first occurrence per language wins)
        facet
            .translations
            .entry(row.language_code.clone())
            .or_insert_with(|| FacetTranslationPayload {
                label: row.facet_label.clone(),
            });

        // Find or create the tag entry within this facet
        let tag = match facet.tags.iter_mut().find(|t| t.slug == row.tag_slug) {
            Some(t) => t,
            None => {
                facet.tags.push(TagResponse {
                    slug: row.tag_slug.clone(),
                    sort_order: row.tag_sort_order,
                    translations: HashMap::new(),
                });
                facet.tags.last_mut().unwrap()
            }
        };

        // Add this language's tag translation
        tag.translations.insert(
            row.language_code,
            TagTranslationPayload {
                label: row.tag_label,
                description: row.tag_description,
            },
        );
    }

    facets
}
