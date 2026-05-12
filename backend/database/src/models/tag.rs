use ormlite::Model;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

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

/// Slim per-entity tag projection used by list endpoints. Just enough
/// for the frontend to look up the localized label in the taxonomy cache.
#[derive(Debug, Clone, PartialEq, Eq, FromRow, Serialize, Deserialize, ToSchema)]
pub struct EntityTagSlim {
    pub slug: String,
    pub facet: String,
}
