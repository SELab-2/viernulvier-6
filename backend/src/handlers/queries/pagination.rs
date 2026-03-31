use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
pub struct PaginationQuery {
    pub cursor: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    20
}
