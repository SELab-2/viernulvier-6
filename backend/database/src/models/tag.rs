use ormlite::Model;
use sqlx::FromRow;
use uuid::Uuid;

use crate::models::{entity_type::EntityType, facet::Facet};

/// Full tag record, mapped to the `tags` table.
#[derive(Debug, Model)]
#[ormlite(insert = "TagCreate")]
#[ormlite(table = "tags")]
pub struct Tag {
    pub id: Uuid,
    pub facet: Facet,
    pub slug: String,
    pub label: String,
    pub description: Option<String>,
    pub sort_order: i32,
}

/// Tag with resolved slugs and labels, scoped to a specific entity. Read from the `entity_tags` view.
#[derive(Debug, FromRow)]
pub struct EntityTag {
    pub entity_type: EntityType,
    pub entity_id: Uuid,
    pub inherited: bool,
    pub facet_slug: String,
    pub facet_label: String,
    pub tag_slug: String,
    pub tag_label: String,
    pub tag_sort_order: i32,
}

/// Tag with its facet's slug and label. Used for the taxonomy endpoint.
#[derive(Debug, FromRow)]
pub struct TaxonomyTag {
    pub facet_slug: String,
    pub facet_label: String,
    pub tag_slug: String,
    pub tag_label: String,
    pub tag_sort_order: i32,
}
