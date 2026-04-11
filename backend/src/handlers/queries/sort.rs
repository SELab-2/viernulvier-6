use o2o::o2o;
use serde::Deserialize;
use utoipa::ToSchema;

use database::models::filtering::sort::Sort as DbSort;

#[derive(o2o, Deserialize, ToSchema, Debug, Default)]
#[owned_into(DbSort)]
#[serde(rename_all = "snake_case")]
pub enum Sort {
    Recent,
    Oldest,
    #[default]
    Relevance,
}
