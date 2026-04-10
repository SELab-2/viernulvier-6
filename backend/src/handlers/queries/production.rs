use database::models::production::ProductionSearch;
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::sort::Sort;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(ProductionSearch)]
pub struct ProductionSearchQuery {
    pub q: Option<String>,
    pub discipline: Option<String>,
    pub format: Option<String>,
    pub theme: Option<String>,
    pub audience: Option<String>,
    pub artist: Option<String>,
    pub location: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,

    #[owned_into(~.map(Into::into))] // map the query sort to the database sort
    pub sort: Option<Sort>,
    pub after: Option<String>,
}
