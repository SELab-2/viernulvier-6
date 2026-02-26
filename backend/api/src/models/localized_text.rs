use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ApiLocalizedText {
    pub en: Option<String>,
    pub fr: Option<String>,
    pub nl: Option<String>,
    // some include `af` for some reason
}
