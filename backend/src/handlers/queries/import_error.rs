use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
pub struct GetImportErrorsFilterQuery {
    #[serde(default)]
    pub resolved: bool,
}
