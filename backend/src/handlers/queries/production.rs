use database::models::production::ProductionSearch;
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::sort::Sort;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(ProductionSearch)]
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
    #[param(value_type = String, required = false)]
    pub date_from: Option<String>,
    #[param(value_type = String, required = false)]
    pub date_to: Option<String>,

    #[owned_into(~.map(Into::into))] // map the query sort to the database sort
    #[param(value_type = Sort, inline, required = false)]
    pub sort: Option<Sort>,
    pub after: Option<String>,
}
