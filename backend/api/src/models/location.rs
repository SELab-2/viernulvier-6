use chrono::{DateTime, Utc};
use database::models::location::{LocationBase, LocationCreate};
use serde::Deserialize;
use tracing::warn;

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
    
    // references
    pub spaces: Vec<String>, //TODO: currently not implemented
}

impl From<ApiLocation> for LocationCreate {
    fn from(api: ApiLocation) -> Self {
        let source_id = api
            .id
            .split('/')
            .next_back() // removes and takes the end of the iterator, in this case the id
            .and_then(|s| s.parse::<i32>().ok()); 

        let is_owned_by_viernulvier = match api.own_location.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!("unexpected own_location value: {}, defaulting to false", other);
                false
            },
        };

        // TODO: implement reference to spaces? 

        Self {
            source_id,
            base: LocationBase {
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
            },
        }
    }
}

