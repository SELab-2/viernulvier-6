use o2o::o2o;
use serde::Deserialize;
use utoipa::ToSchema;

use database::models::sort::Sort as DbSort;

#[derive(o2o, Deserialize, ToSchema, Debug)]
#[owned_into(DbSort)]
#[serde(rename_all = "snake_case")]
pub enum Sort {
    Recent,
    Oldest,
    Relevance,
}
