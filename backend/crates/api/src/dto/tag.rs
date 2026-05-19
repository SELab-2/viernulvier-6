use db::models::facet::Facet;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTagRequest {
    pub facet: Facet,
    pub translations: Vec<TagTranslationInput>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTagRequest {
    pub translations: Vec<TagTranslationInput>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema, Clone)]
pub struct TagTranslationInput {
    pub language_code: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TagUsageResponse {
    pub usage_count: i64,
}
