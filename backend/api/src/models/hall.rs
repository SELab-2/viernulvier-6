use crate::{
    error::{ImportEntity, ImportField, ImportItemError, ImportItemWarning, ItemConversion},
    helper::{extract_source_id, flatten_single},
    models::localized_text::ApiLocalizedText,
};
use chrono::{DateTime, Utc};
use database::models::hall::HallCreate;
use serde::Deserialize;

use slug::slugify;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ApiHall {
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

// halls are linked to a space, many_to_one. function that takes an ApiModel and a Uuid for
// space, and returns a create model for Halls
impl ApiHall {
    pub fn to_create(
        self,
        space_uuid: Option<Uuid>,
    ) -> Result<ItemConversion<HallCreate>, ImportItemError> {
        let source_id = extract_source_id(&self.id);
        let mut warnings = Vec::new();

        let seat_selection = match self.seat_selection.as_str() {
            "1" => true,
            "" => false,
            other => {
                warnings.push(ImportItemWarning::UnexpectedFieldValue {
                    entity: ImportEntity::Hall,
                    field: ImportField::SeatSelection,
                    value: other.into(),
                    fallback: "false",
                });
                false
            }
        };

        let open_seating = match self.open_seating.as_str() {
            "1" => true,
            "" => false,
            other => {
                warnings.push(ImportItemWarning::UnexpectedFieldValue {
                    entity: ImportEntity::Hall,
                    field: ImportField::OpenSeating,
                    value: other.into(),
                    fallback: "false",
                });
                false
            }
        };

        let Some(name) = flatten_single(Some(self.name)) else {
            return Err(ImportItemError::missing_required_field(
                ImportEntity::Hall,
                ImportField::Name,
            ));
        };

        let remark = flatten_single(self.remark);

        // The slug must be unique and stable across re-imports. We rely on the
        // upstream `source_id` for that uniqueness, so refuse to fabricate a
        // slug for halls that have no source_id (rather than collide on
        // `<name>-0` for every such hall).
        let Some(source_id_for_slug) = source_id else {
            return Err(ImportItemError::missing_required_field(
                ImportEntity::Hall,
                ImportField::SourceId,
            ));
        };
        let slug = format!("{}-{}", slugify(&name), source_id_for_slug);

        Ok(ItemConversion {
            value: HallCreate {
                source_id,
                slug,
                vendor_id: self.vendor_id,
                box_office_id: self.box_office_id,
                seat_selection: Some(seat_selection),
                open_seating: Some(open_seating),
                name,
                remark,
                space_id: space_uuid,
            },
            warnings,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_hall(
        id: &str,
        seat_selection: &str,
        open_seating: &str,
        name: ApiLocalizedText,
    ) -> ApiHall {
        ApiHall {
            id: id.into(),
            jsonld_type: "Hall".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            vendor_id: None,
            box_office_id: None,
            seat_selection: seat_selection.into(),
            open_seating: open_seating.into(),
            name,
            remark: None,
            space: None,
        }
    }

    fn name(value: &str) -> ApiLocalizedText {
        ApiLocalizedText {
            nl: Some(value.into()),
            en: None,
            fr: None,
        }
    }

    #[test]
    fn to_create_happy_path_no_warnings() {
        let hall = make_hall("/api/v1/halls/9", "1", "", name("Main Hall"));

        let conversion = hall.to_create(None).expect("conversion succeeds");
        assert_eq!(conversion.value.name, "Main Hall");
        assert_eq!(conversion.value.slug, "main-hall-9");
        assert_eq!(conversion.value.seat_selection, Some(true));
        assert_eq!(conversion.value.open_seating, Some(false));
        assert!(conversion.warnings.is_empty());
    }

    #[test]
    fn to_create_returns_missing_required_field_when_name_empty() {
        let hall = make_hall("/api/v1/halls/9", "1", "", ApiLocalizedText::default());

        let err = hall.to_create(None).unwrap_err();
        match err {
            ImportItemError::MissingRequiredField { entity, field } => {
                assert_eq!(entity, ImportEntity::Hall);
                assert_eq!(field, ImportField::Name);
            }
            other => panic!("expected MissingRequiredField, got {other:?}"),
        }
    }

    #[test]
    fn to_create_returns_missing_required_field_when_source_id_unparseable() {
        let hall = make_hall("/api/v1/halls/abc", "1", "", name("Main Hall"));

        let err = hall.to_create(None).unwrap_err();
        match err {
            ImportItemError::MissingRequiredField { entity, field } => {
                assert_eq!(entity, ImportEntity::Hall);
                assert_eq!(field, ImportField::SourceId);
            }
            other => panic!("expected MissingRequiredField for source_id, got {other:?}"),
        }
    }

    #[test]
    fn to_create_accumulates_warnings_for_unexpected_field_values() {
        let hall = make_hall("/api/v1/halls/9", "yes", "no", name("Main Hall"));

        let conversion = hall.to_create(None).expect("conversion still succeeds");
        // Both seat_selection and open_seating fall back to false
        assert_eq!(conversion.value.seat_selection, Some(false));
        assert_eq!(conversion.value.open_seating, Some(false));
        assert_eq!(conversion.warnings.len(), 2);

        let fields: Vec<ImportField> = conversion
            .warnings
            .iter()
            .map(|w| match w {
                ImportItemWarning::UnexpectedFieldValue { field, .. } => *field,
                other => panic!("unexpected warning variant: {other:?}"),
            })
            .collect();
        assert!(fields.contains(&ImportField::SeatSelection));
        assert!(fields.contains(&ImportField::OpenSeating));
    }
}
