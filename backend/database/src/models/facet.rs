use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model)]
#[ormlite(insert = "FacetCreate")]
#[ormlite(table = "facets")]
pub struct Facet {
    pub id: Uuid,
    pub slug: String,
    pub label: String,
    pub description: Option<String>,
    pub sort_order: i32,
}
