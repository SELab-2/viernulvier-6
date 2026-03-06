use chrono::{DateTime, Utc};
use serde::Deserialize;
use tracing::warn;
use database::models::hall::HallCreate;
use crate::{
    helper::{flatten_single, extract_source_id},
    models::localized_text::ApiLocalizedText,
};

use slug::slugify;
use uuid::Uuid;

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
    pub space: String,
}

// halls are linked to a space, many_to_one. function that takes an ApiModel and a Uuid for
// space, and returns a create model for Halls
impl ApiHall {
    pub fn to_create(self, space_uuid: Uuid) -> HallCreate {
        let source_id = extract_source_id(&self.id);

        let seat_selection = match self.seat_selection.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!("unexpected seat_selection value: {}, defaulting to false", other);
                false
            },
        };

        let open_seating = match self.open_seating.as_str() {
            "1" => true,
            "" => false,
            other => {
                warn!("unexpected open_seating value: {}, defaulting to false", other);
                false
            },
        };

        let name = flatten_single(Some(self.name))
            .expect("name should always be present"); // helper expects Option

        let remark = flatten_single(self.remark);
        
        let slug = format!("{}-{}", slugify(&name), source_id);

        HallCreate {
            source_id: Some(source_id),
            slug,
            vendor_id: self.vendor_id,
            box_office_id: self.box_office_id,
            seat_selection: Some(seat_selection),
            open_seating: Some(open_seating),
            name,
            remark,
            space_id: space_uuid,
        }

    }
}

