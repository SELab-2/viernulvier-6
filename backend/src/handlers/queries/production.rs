use chrono::NaiveDate;
use database::models::{filtering::facets::FacetFilters, production::ProductionFilters};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::{sort::Sort, split_strip::split_strip};

#[derive(Deserialize, IntoParams)]
pub struct ProductionSearchQuery {
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
    pub artist: Option<String>,
    #[param(value_type = String, required = false)]
    pub location: Option<String>,
    #[param(value_type = NaiveDate, required = false)]
    pub date_from: Option<NaiveDate>,
    #[param(value_type = NaiveDate, required = false)]
    pub date_to: Option<NaiveDate>,

    #[param(value_type = Sort, inline, required = false)]
    pub sort: Option<Sort>,
}

impl From<ProductionSearchQuery> for ProductionFilters {
    fn from(value: ProductionSearchQuery) -> Self {
        Self {
            search: value.q,
            facets: FacetFilters {
                disciplines: value.discipline.as_deref().map(split_strip),
                formats: value.format.as_deref().map(split_strip),
                themes: value.theme.as_deref().map(split_strip),
                audiences: value.audience.as_deref().map(split_strip),
            },
            locations: value.location.as_deref().map(split_strip),
            date_from: value.date_from,
            date_to: value.date_to,
            sort: value.sort.unwrap_or_default().into(),
        }
    }
}
