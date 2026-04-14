use database::models::hall::HallSearch;
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(HallSearch)]
pub struct HallSearchQuery {
    pub q: Option<String>,
}
