use chrono::NaiveDate;
use database::models::{filtering::facets::FacetFilters, production::ProductionFilters};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::{sort::Sort, split_strip::split_strip};

#[derive(Deserialize, IntoParams)]
pub struct ProductionSearchQuery {
    pub q: Option<String>,
    // facets
    pub discipline: Option<String>,
    pub format: Option<String>,
    pub theme: Option<String>,
    pub audience: Option<String>,
    // search on location
    pub location: Option<String>,
    // date of a production's events
    pub date_from: Option<NaiveDate>,
    pub date_to: Option<NaiveDate>,
    // sort direction
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
            sort: value.sort.map(Sort::into),
        }
    }
}
