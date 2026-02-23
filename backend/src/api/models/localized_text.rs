use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct LocalizedText {
    pub en: Option<String>,
    pub fr: Option<String>,
    pub nl: Option<String>,
    // some include af for some reason
}
