use db::models::filtering::facets::FacetFilters;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::split_strip::split_strip;

#[derive(Deserialize, IntoParams)]
pub struct ArtistSearchQuery {
    pub q: Option<String>,
    #[param(value_type = String, required = false)]
    pub discipline: Option<String>,
    #[param(value_type = String, required = false)]
    pub format: Option<String>,
    #[param(value_type = String, required = false)]
    pub theme: Option<String>,
    #[param(value_type = String, required = false)]
    pub audience: Option<String>,
    #[param(value_type = String, required = false)]
    pub accessibility: Option<String>,
    #[param(value_type = String, required = false)]
    pub language: Option<String>,
}

impl ArtistSearchQuery {
    pub fn facets(&self) -> FacetFilters {
        FacetFilters {
            disciplines: self.discipline.as_deref().map(split_strip),
            formats: self.format.as_deref().map(split_strip),
            themes: self.theme.as_deref().map(split_strip),
            audiences: self.audience.as_deref().map(split_strip),
            accessibilities: self.accessibility.as_deref().map(split_strip),
            languages: self.language.as_deref().map(split_strip),
        }
    }
}
