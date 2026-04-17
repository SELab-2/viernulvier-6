use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
pub struct ArticleSearchQuery {
    pub q: Option<String>,
}
