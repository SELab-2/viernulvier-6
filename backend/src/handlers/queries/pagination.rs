use serde::{Deserialize, Deserializer};
use utoipa::{IntoParams, ToSchema};

#[derive(Deserialize, IntoParams, ToSchema)]
pub struct PaginationQuery {
    pub cursor: Option<String>,
    #[serde(
        default = "default_limit",
        deserialize_with = "deserialize_capped_limit"
    )]
    #[param(maximum = 100, minimum = 1)]
    pub limit: u32,
}

fn default_limit() -> u32 {
    20
}

/// cap the page limit to 100
fn deserialize_capped_limit<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    let limit = u32::deserialize(deserializer)?;
    Ok(limit.min(100))
}
