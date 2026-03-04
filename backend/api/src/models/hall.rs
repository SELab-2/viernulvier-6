use chrono::{DateTime, Utc};
use serde::Deserialize;
use tracing::warn;
use database::models::halls::HallCreate;
use crate::{
    helper::flatten_single,
    models::localized_text::ApiLocalizedText,
};

#[derive(Debug, Deserialize)]
pub struct ApiHall {
    #[serde(rename = "@context")]
    pub context: String,

    #[serde(rename = "@id")]
    pub id: String,

    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,

    pub seat_selection: String,
    pub open_seating: String,

    pub name: ApiLocalizedText,
    pub remark: Option<ApiLocalizedText>, // did not find a single 'remark' field returned by the API

    /// link to location where the space is located
    /// "/api/v1/space/{id}"
    pub space: Option<String>,
}

use slug::slugify;
use uuid::Uuid; // FIX: temporary, see location_id at the bottom of the file

impl From<ApiHall> for HallCreate {
    fn from(api: ApiHall) -> Self {
        let source_id = api
            .id
            .split('/')
            .next_back()
            .and_then(|s| s.parse::<i32>().ok());
        
        let seat_selection = match api.seat_selection.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!("unexpected seat_selection value: {}, defaulting to false", other);
                false
            },
        };

        let open_seating = match api.open_seating.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!("unexpected open_seating value: {}, defaulting to false", other);
                false
            },
        };

        let name = flatten_single(api.name);
        let remark = flatten_single(api.remark);
        
        let slug = match source_id {
            Some(id) => format!("{}-{}", slugify(&name), id),
            None => slugify(&name),
        };

        Self {
            source_id,
            slug,
            vendor_id: api.vendor_id,
            box_office_id: api.box_office_id,
            seat_selection: Some(seat_selection),
            seat_selection: Some(open_seating),
            name,
            remark: remark,
            
            location_id: Uuid::nil(), // FIX: workaroud for now, this is a hyperlink to a 'space', which in turn contains a location
            // the Uuid of that location should come here. Is that wat we want?
        }
    }
}

