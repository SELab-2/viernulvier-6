use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use database::models::space::SpaceCreate;
use crate::{
    helper::{flatten_single, extract_source_id},
    models::localized_text::ApiLocalizedText,
};

#[derive(Debug, Deserialize)]
pub struct ApiSpace {
    #[serde(rename = "@id")]
    pub id: String,

    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub name: ApiLocalizedText,

    /// link to location where the space is located
    /// "/api/v1/locations/{id}"
    pub location: String,

    /// list of linked halls
    /// \[
    ///   "/api/v1/halls/{id}",
    ///   "/api/v1/halls/{id}"
    /// \]
    pub halls: Vec<String>,
}


// spaces are linked to a location, many_to_one. function that takes an ApiModel and a Uuid for
// location, and returns a create model for Spaces
impl ApiSpace {
    pub fn to_create(self, location_uuid: Uuid) -> SpaceCreate {
        let source_id = extract_source_id(&self.id);

        let name_nl = flatten_single(Some(self.name))
            .expect("space should always have a name");

        SpaceCreate {
            source_id: Some(source_id),
            name_nl,
            location_id: location_uuid,
        }
    }
}

