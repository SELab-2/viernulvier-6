use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{ImportEntity, ImportField, ImportItemError},
    helper::{extract_source_id, flatten_single},
    models::localized_text::ApiLocalizedText,
};
use database::models::space::SpaceCreate;

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
    pub fn to_create(self, location_uuid: Uuid) -> Result<SpaceCreate, ImportItemError> {
        let source_id = extract_source_id(&self.id);

        let Some(name_nl) = flatten_single(Some(self.name)) else {
            return Err(ImportItemError::missing_required_field(
                ImportEntity::Space,
                ImportField::Name,
            ));
        };

        Ok(SpaceCreate {
            source_id,
            name_nl,
            location_id: location_uuid,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_space(name: ApiLocalizedText) -> ApiSpace {
        ApiSpace {
            id: "/api/v1/spaces/42".into(),
            jsonld_type: "Space".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            name,
            location: "/api/v1/locations/1".into(),
            halls: vec![],
        }
    }

    #[test]
    fn to_create_returns_missing_required_field_when_name_empty() {
        let space = make_space(ApiLocalizedText::default());

        let err = space.to_create(Uuid::nil()).unwrap_err();
        match err {
            ImportItemError::MissingRequiredField { entity, field } => {
                assert_eq!(entity, ImportEntity::Space);
                assert_eq!(field, ImportField::Name);
            }
            other => panic!("expected MissingRequiredField, got {other:?}"),
        }
    }
}
