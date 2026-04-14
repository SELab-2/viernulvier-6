use database::models::location::LocationSearch;
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(LocationSearch)]
pub struct LocationSearchQuery {
    pub q: Option<String>,
}
