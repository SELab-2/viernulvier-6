use serde::Serialize;
use utoipa::ToSchema;

// what API returns when a caller asks for an entity's tags grouped by facet
#[derive(Serialize, ToSchema)]
pub struct TagDto {
    pub slug: String,
    pub label: String,
    pub inherited: bool,
}

#[derive(Serialize, ToSchema)]
pub struct FacetDto {
    pub slug: String,
    pub label: String,
    pub tags: Vec<TagDto>,
}
