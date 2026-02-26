use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ApiCollection<T> {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: Option<String>,
    #[serde(rename = "totalItems")]
    pub total_items: u64,
    #[serde(rename = "member")]
    pub members: Vec<T>,
    pub view: View,
    pub search: Search,
}

#[derive(Debug, Deserialize)]
pub struct View {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub first: String,
    pub last: String,
    pub previous: Option<String>,
    pub next: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Search {
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub template: String,
    #[serde(rename = "variableRepresentation")]
    pub variable_representation: String,
    pub mapping: Vec<Mapping>,
}

#[derive(Debug, Deserialize)]
pub struct Mapping {
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub variable: String,
    pub property: String,
    pub required: bool,
}
