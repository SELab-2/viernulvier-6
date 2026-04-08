use ormlite::Model;
use sqlx::FromRow;
use uuid::Uuid;

use crate::models::entity_type::EntityType;

/// Full tag record from the `tags` table (labels live in `tag_translations`).
#[derive(Debug, Model)]
#[ormlite(insert = "TagCreate")]
#[ormlite(table = "tags")]
pub struct Tag {
    pub id: Uuid,
    pub facet: crate::models::facet::Facet,
    pub slug: String,
    pub sort_order: i32,
}

/// One row from the taxonomy query — one record per (tag × language).
/// Used by `with_facets` and `with_facets_for_entity`.
#[derive(Debug, FromRow)]
pub struct TaxonomyRow {
    pub facet_slug: String,
    pub tag_slug: String,
    pub tag_sort_order: i32,
    pub language_code: String,
    pub tag_label: String,
    pub tag_description: Option<String>,
    pub facet_label: String,
}

/// One row from the for_entity query — one record per (tagging × language).
#[derive(Debug, FromRow)]
pub struct EntityTagRow {
    pub entity_type: EntityType,
    pub entity_id: Uuid,
    pub inherited: bool,
    pub facet_slug: String,
    pub tag_slug: String,
    pub tag_sort_order: i32,
    pub language_code: String,
    pub tag_label: String,
    pub facet_label: String,
}

#[derive(Debug, FromRow)]
pub struct TagWithFacet {
    pub facet_slug: String,
    pub facet_label: String,
    pub facet_sort_order: i32,
    pub tag_slug: String,
    pub tag_label: String,
    pub tag_sort_order: i32,
}
