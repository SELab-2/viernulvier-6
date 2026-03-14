use ormlite::Model;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Model)]
#[ormlite(insert = "TagCreate")]
#[ormlite(table = "tags")]
pub struct Tag {
    pub id: Uuid,
    pub facet_id: Uuid,
    pub slug: String,
    pub label: String,
    pub description: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, FromRow)]
pub struct EntityTag {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub inherited: bool,
    pub facet_slug: String,
    pub facet_label: String,
    pub tag_slug: String,
    pub tag_label: String,
    pub sort_order: i32,
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
