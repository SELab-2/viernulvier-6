use chrono::{DateTime, Utc};
use database::models::location::LocationCreate;
use serde::Deserialize;
use tracing::warn;

use crate::helper::extract_source_id;

#[derive(Deserialize, Debug)]
pub struct ApiLocation {
    // member @id, @type
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,

    // info
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub name: Option<String>, // not present in their API, but sometimes present in their CSV
    // containing the older data.
    pub code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub postal_code: Option<String>,
    pub city: Option<String>,
    pub phone_1: Option<String>,
    pub phone_2: Option<String>,
    pub own_location: String, // "" for false, "1" for true, as per the API
    pub country: Option<String>,
    pub uitdatabank_id: Option<String>,
}

impl From<ApiLocation> for LocationCreate {
    fn from(api: ApiLocation) -> Self {
        let source_id = extract_source_id(&api.id);

        let is_owned_by_viernulvier = match api.own_location.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!(
                    "unexpected own_location value: {}, defaulting to false",
                    other
                );
                false
            }
        };

        Self {
            source_id, // FIX: source_id's are currently Nullable inside the tables. Is there
            // a reason for that?
            name: api.name,
            code: api.code,
            street: api.street,
            number: api.number,
            postal_code: api.postal_code,
            city: api.city,
            country: api.country,
            phone_1: api.phone_1,
            phone_2: api.phone_2,
            is_owned_by_viernulvier: Some(is_owned_by_viernulvier),
            uitdatabank_id: api.uitdatabank_id,
            slug: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn own_location_1_is_true() {
        let loc = ApiLocation {
            id: "https://www.viernulvier.gent/api/v1/locations/10".into(),
            jsonld_type: "Location".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            name: None, code: None, street: None, number: None,
            postal_code: None, city: None, phone_1: None, phone_2: None,
            own_location: "1".into(), country: None, uitdatabank_id: None,
        };
        let create: LocationCreate = loc.into();
        assert_eq!(create.is_owned_by_viernulvier, Some(true));
    }

    #[test]
    fn own_location_empty_is_false() {
        let loc = ApiLocation {
            id: "https://www.viernulvier.gent/api/v1/locations/10".into(),
            jsonld_type: "Location".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            name: None, code: None, street: None, number: None,
            postal_code: None, city: None, phone_1: None, phone_2: None,
            own_location: "".into(), country: None, uitdatabank_id: None,
        };
        let create: LocationCreate = loc.into();
        assert_eq!(create.is_owned_by_viernulvier, Some(false));
    }

    #[test]
    fn own_location_unexpected_defaults_to_false() {
        let loc = ApiLocation {
            id: "https://www.viernulvier.gent/api/v1/locations/10".into(),
            jsonld_type: "Location".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            name: None, code: None, street: None, number: None,
            postal_code: None, city: None, phone_1: None, phone_2: None,
            own_location: "true".into(), country: None, uitdatabank_id: None,
        };
        let create: LocationCreate = loc.into();
        assert_eq!(create.is_owned_by_viernulvier, Some(false));
    }

    #[test]
    fn to_create_extracts_source_id() {
        let loc = ApiLocation {
            id: "https://www.viernulvier.gent/api/v1/locations/42".into(),
            jsonld_type: "Location".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            name: Some("Test Location".into()), code: Some("TL".into()),
            street: Some("Main St".into()), number: Some("1".into()),
            postal_code: Some("9000".into()), city: Some("Gent".into()),
            phone_1: None, phone_2: None,
            own_location: "".into(), country: Some("BE".into()),
            uitdatabank_id: Some("uid-123".into()),
        };
        let create: LocationCreate = loc.into();
        assert_eq!(create.source_id, Some(42));
        assert_eq!(create.name, Some("Test Location".into()));
        assert_eq!(create.code, Some("TL".into()));
        assert_eq!(create.street, Some("Main St".into()));
        assert_eq!(create.uitdatabank_id, Some("uid-123".into()));
        assert_eq!(create.slug, None);
    }
}
