use chrono::{DateTime, Utc};
use database::models::event::EventCreate;
use serde::Deserialize;
use uuid::Uuid;

use crate::error::{ImportEntity, ImportField, ImportItemError, ItemConversion};
use crate::helper::extract_source_id;
use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct ApiEventProduction {
    #[serde(rename = "@id")]
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEvent {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: Option<DateTime<Utc>>,
    pub intermission_at: Option<DateTime<Utc>>,
    pub doors_at: Option<DateTime<Utc>>,

    pub box_office_id: Option<String>,
    pub vendor_id: Option<String>,
    pub max_tickets_per_order: Option<u32>,
    pub uitdatabank_id: Option<String>,
    pub secure: bool,
    pub sms_verification: bool,

    pub production: ApiEventProduction,
    pub status: String,
    pub hall: String,

    pub info: Option<ApiLocalizedText>,
    pub eticket_info: Option<ApiLocalizedText>,
    pub external_order_url: Option<ApiLocalizedText>,
}

impl ApiEvent {
    pub fn production_source_id(&self) -> Option<i32> {
        extract_source_id(&self.production.id)
    }

    pub fn hall_source_id(&self) -> Option<i32> {
        extract_source_id(&self.hall)
    }

    pub fn to_create(
        self,
        production_id: Uuid,
        hall_id: Option<Uuid>,
    ) -> Result<ItemConversion<EventCreate>, ImportItemError> {
        let max_tickets_per_order = self
            .max_tickets_per_order
            .map(i32::try_from)
            .transpose()
            .map_err(|_| {
                ImportItemError::out_of_range(
                    ImportEntity::Event,
                    ImportField::MaxTicketsPerOrder,
                    format!("{:?}", self.max_tickets_per_order),
                )
            })?;

        Ok(ItemConversion::without_warnings(EventCreate {
            source_id: extract_source_id(&self.id),
            created_at: self.created_at,
            updated_at: self.updated_at,
            starts_at: self.starts_at,
            ends_at: self.ends_at,
            intermission_at: self.intermission_at,
            doors_at: self.doors_at,
            vendor_id: self.vendor_id,
            box_office_id: self.box_office_id,
            uitdatabank_id: self.uitdatabank_id,
            max_tickets_per_order,
            production_id,
            status: self.status,
            hall_id,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_event(max_tickets_per_order: Option<u32>) -> ApiEvent {
        let now = Utc::now();
        ApiEvent {
            id: "/api/v1/events/100".into(),
            jsonld_type: "Event".into(),
            created_at: now,
            updated_at: now,
            starts_at: now,
            ends_at: None,
            intermission_at: None,
            doors_at: None,
            box_office_id: None,
            vendor_id: None,
            max_tickets_per_order,
            uitdatabank_id: None,
            secure: false,
            sms_verification: false,
            production: ApiEventProduction {
                id: "/api/v1/productions/7".into(),
            },
            status: "scheduled".into(),
            hall: "/api/v1/halls/3".into(),
            info: None,
            eticket_info: None,
            external_order_url: None,
        }
    }

    #[test]
    fn to_create_returns_out_of_range_when_max_tickets_overflows_i32() {
        let too_big = (i32::MAX as u32) + 1;
        let event = make_event(Some(too_big));

        let err = event.to_create(Uuid::nil(), None).unwrap_err();
        match err {
            ImportItemError::OutOfRange {
                entity,
                field,
                value,
            } => {
                assert_eq!(entity, ImportEntity::Event);
                assert_eq!(field, ImportField::MaxTicketsPerOrder);
                assert_eq!(value, format!("Some({too_big})"));
            }
            other => panic!("expected OutOfRange, got {other:?}"),
        }
    }

    #[test]
    fn to_create_accepts_max_tickets_within_i32() {
        let event = make_event(Some(10));
        let conversion = event
            .to_create(Uuid::nil(), None)
            .expect("conversion succeeds");
        assert_eq!(conversion.value.max_tickets_per_order, Some(10));
    }
}
