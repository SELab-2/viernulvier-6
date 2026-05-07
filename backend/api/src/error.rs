use database::{error::DatabaseError, models::import_error::ImportErrorCreate};
use thiserror::Error;
use uuid::Uuid;

// ImportEntity, ImportField and ImportRelation are small enums that allow
// for stuff like ImportEntity::Event, removing strings from the picture

/// Speciefies what entity we are importing
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportEntity {
    Event,
    EventPrice,
    Gallery,
    Hall,
    Location,
    Media,
    MediaVariant,
    Price,
    PriceRank,
    Production,
    Space,
}

impl ImportEntity {
    fn as_str(self) -> &'static str {
        match self {
            Self::Event => "event",
            Self::EventPrice => "event_price",
            Self::Gallery => "gallery",
            Self::Hall => "hall",
            Self::Location => "location",
            Self::Media => "media",
            Self::MediaVariant => "media_variant",
            Self::Price => "price",
            Self::PriceRank => "price_rank",
            Self::Production => "production",
            Self::Space => "space",
        }
    }
}

impl From<&'static str> for ImportEntity {
    fn from(value: &'static str) -> Self {
        match value {
            "event" => Self::Event,
            "event_price" => Self::EventPrice,
            "gallery" => Self::Gallery,
            "hall" => Self::Hall,
            "location" => Self::Location,
            "media" => Self::Media,
            "media_variant" => Self::MediaVariant,
            "price" => Self::Price,
            "price_rank" => Self::PriceRank,
            "production" => Self::Production,
            "space" => Self::Space,
            other => panic!("unknown import entity: {other}"),
        }
    }
}

/// Specifies what field causes problems
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportField {
    Amount,
    CdnUrl,
    Crop,
    Event,
    Format,
    GalleryUrl,
    Location,
    MaxTicketsPerOrder,
    Name,
    OpenSeating,
    Price,
    Production,
    Rank,
    SeatSelection,
    SourceId,
    SourceUri,
    Status,
}

impl ImportField {
    fn as_str(self) -> &'static str {
        match self {
            Self::Amount => "amount",
            Self::CdnUrl => "cdn_url",
            Self::Crop => "crop",
            Self::Event => "event",
            Self::Format => "format",
            Self::GalleryUrl => "gallery_url",
            Self::Location => "location",
            Self::MaxTicketsPerOrder => "max_tickets_per_order",
            Self::Name => "name",
            Self::OpenSeating => "open_seating",
            Self::Price => "price",
            Self::Production => "production",
            Self::Rank => "rank",
            Self::SeatSelection => "seat_selection",
            Self::SourceId => "source_id",
            Self::SourceUri => "source_uri",
            Self::Status => "status",
        }
    }
}

impl From<&'static str> for ImportField {
    fn from(value: &'static str) -> Self {
        match value {
            "amount" => Self::Amount,
            "cdn_url" => Self::CdnUrl,
            "crop" => Self::Crop,
            "event" => Self::Event,
            "format" => Self::Format,
            "gallery_url" => Self::GalleryUrl,
            "location" => Self::Location,
            "max_tickets_per_order" => Self::MaxTicketsPerOrder,
            "name" => Self::Name,
            "open_seating" => Self::OpenSeating,
            "price" => Self::Price,
            "production" => Self::Production,
            "rank" => Self::Rank,
            "seat_selection" => Self::SeatSelection,
            "source_id" => Self::SourceId,
            "source_uri" => Self::SourceUri,
            "status" => Self::Status,
            other => panic!("unknown import field: {other}"),
        }
    }
}

/// Specifies which linked entity is involved
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportRelation {
    Event,
    EventPrice,
    Gallery,
    Hall,
    Location,
    Media,
    MediaVariant,
    Price,
    PriceRank,
    Production,
    Space,
}

impl ImportRelation {
    fn as_str(self) -> &'static str {
        match self {
            Self::Event => "event",
            Self::EventPrice => "event_price",
            Self::Gallery => "gallery",
            Self::Hall => "hall",
            Self::Location => "location",
            Self::Media => "media",
            Self::MediaVariant => "media_variant",
            Self::Price => "price",
            Self::PriceRank => "price_rank",
            Self::Production => "production",
            Self::Space => "space",
        }
    }
}

impl From<&'static str> for ImportRelation {
    fn from(value: &'static str) -> Self {
        match value {
            "event" => Self::Event,
            "event_price" => Self::EventPrice,
            "gallery" => Self::Gallery,
            "hall" => Self::Hall,
            "location" => Self::Location,
            "media" => Self::Media,
            "media_variant" => Self::MediaVariant,
            "price" => Self::Price,
            "price_rank" => Self::PriceRank,
            "production" => Self::Production,
            "space" => Self::Space,
            other => panic!("unknown import relation: {other}"),
        }
    }
}

/// Enum for importer-level failures, like S3 or IO issues, or network issues.
/// These are run-ending failures.
#[derive(Debug, Error)]
pub enum ImporterError {
    #[error("Reqwest error: {0}")]
    Reqwest(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("S3 error: {0}")]
    S3(String),
}

/// Errors are modeled as explicit enums so we don't end up matching on hardcoded
/// strings when reporting them.
#[derive(Debug)]
pub struct ItemConversion<T> {
    pub value: T,
    pub warnings: Vec<ImportItemWarning>,
}

impl<T> ItemConversion<T> {
    /// Creates a successful conversion result when there is nothing to warn about.
    pub fn without_warnings(value: T) -> Self {
        Self {
            value,
            warnings: Vec::new(),
        }
    }
}

/// Enum for item-level failures: these get recorded in our DB table import_errors, and skipped
/// entirely. Non run-ending.
#[derive(Debug, Error)]
pub enum ImportItemError {
    #[error("{entity} has invalid {field}: {value}")]
    InvalidReference {
        entity: ImportEntity,
        field: ImportField,
        value: String,
    },

    #[error("{entity} references missing {relation} source_id {source_id}")]
    MissingRelation {
        entity: ImportEntity,
        relation: ImportRelation,
        source_id: i32,
    },

    #[error("{entity} is missing required field {field}")]
    MissingRequiredField {
        entity: ImportEntity,
        field: ImportField,
    },

    #[error("{entity}.{field} is out of range: {value}")]
    OutOfRange {
        entity: ImportEntity,
        field: ImportField,
        value: String,
    },

    #[error("failed to load {relation} source_id {source_id} for {entity}: {source}")]
    DatabaseLookup {
        entity: ImportEntity,
        relation: ImportRelation,
        source_id: i32,
        #[source]
        source: DatabaseError,
    },

    #[error("failed to persist {entity} {source_id:?}: {source}")]
    DatabaseWrite {
        entity: ImportEntity,
        source_id: Option<i32>,
        #[source]
        source: DatabaseError,
    },

    #[error("failed to import {entity} {source_id:?}: {message}")]
    ImportFailure {
        entity: ImportEntity,
        field: Option<ImportField>,
        source_id: Option<i32>,
        message: String,
    },
}

impl ImportItemError {
    pub fn to_import_error(&self, run_id: Uuid, item_source_id: Option<i32>) -> ImportErrorCreate {
        let mut error = ImportErrorCreate {
            run_id: Some(run_id),
            severity: "error".into(),
            entity: self.entity().into(),
            source_id: self.source_id().or(item_source_id),
            error_kind: self.kind().into(),
            field: self.field().map(Into::into),
            relation: self.relation().map(Into::into),
            relation_source_id: self.relation_source_id(),
            message: self.to_string(),
            payload: None,
        };

        if let Self::InvalidReference { value, .. } | Self::OutOfRange { value, .. } = self {
            error.payload = Some(serde_json::json!({ "value": value }));
        }

        error
    }

    fn entity(&self) -> &'static str {
        match self {
            Self::InvalidReference { entity, .. }
            | Self::MissingRelation { entity, .. }
            | Self::MissingRequiredField { entity, .. }
            | Self::OutOfRange { entity, .. }
            | Self::DatabaseLookup { entity, .. }
            | Self::DatabaseWrite { entity, .. }
            | Self::ImportFailure { entity, .. } => entity.as_str(),
        }
    }

    fn kind(&self) -> &'static str {
        match self {
            Self::InvalidReference { .. } => "invalid_reference",
            Self::MissingRelation { .. } => "missing_relation",
            Self::MissingRequiredField { .. } => "missing_required_field",
            Self::OutOfRange { .. } => "out_of_range",
            Self::DatabaseLookup { .. } => "database_lookup",
            Self::DatabaseWrite { .. } => "database_write",
            Self::ImportFailure { .. } => "import_failure",
        }
    }

    fn field(&self) -> Option<&'static str> {
        match self {
            Self::InvalidReference { field, .. }
            | Self::MissingRequiredField { field, .. }
            | Self::OutOfRange { field, .. } => Some(field.as_str()),
            Self::ImportFailure { field, .. } => field.map(ImportField::as_str),
            Self::MissingRelation { .. }
            | Self::DatabaseLookup { .. }
            | Self::DatabaseWrite { .. } => None,
        }
    }

    fn relation(&self) -> Option<&'static str> {
        match self {
            Self::MissingRelation { relation, .. } | Self::DatabaseLookup { relation, .. } => {
                Some(relation.as_str())
            }
            Self::InvalidReference { .. }
            | Self::MissingRequiredField { .. }
            | Self::OutOfRange { .. }
            | Self::DatabaseWrite { .. }
            | Self::ImportFailure { .. } => None,
        }
    }

    fn relation_source_id(&self) -> Option<i32> {
        match self {
            Self::MissingRelation { source_id, .. } | Self::DatabaseLookup { source_id, .. } => {
                Some(*source_id)
            }
            Self::InvalidReference { .. }
            | Self::MissingRequiredField { .. }
            | Self::OutOfRange { .. }
            | Self::DatabaseWrite { .. }
            | Self::ImportFailure { .. } => None,
        }
    }

    fn source_id(&self) -> Option<i32> {
        match self {
            Self::DatabaseWrite { source_id, .. } | Self::ImportFailure { source_id, .. } => {
                *source_id
            }
            Self::InvalidReference { .. }
            | Self::MissingRelation { .. }
            | Self::MissingRequiredField { .. }
            | Self::OutOfRange { .. }
            | Self::DatabaseLookup { .. } => None,
        }
    }

    pub fn invalid_reference(
        entity: impl Into<ImportEntity>,
        field: impl Into<ImportField>,
        value: impl Into<String>,
    ) -> Self {
        Self::InvalidReference {
            entity: entity.into(),
            field: field.into(),
            value: value.into(),
        }
    }

    pub fn missing_relation(
        entity: impl Into<ImportEntity>,
        relation: impl Into<ImportRelation>,
        source_id: i32,
    ) -> Self {
        Self::MissingRelation {
            entity: entity.into(),
            relation: relation.into(),
            source_id,
        }
    }

    pub fn missing_required_field(
        entity: impl Into<ImportEntity>,
        field: impl Into<ImportField>,
    ) -> Self {
        Self::MissingRequiredField {
            entity: entity.into(),
            field: field.into(),
        }
    }

    pub fn out_of_range(
        entity: impl Into<ImportEntity>,
        field: impl Into<ImportField>,
        value: impl Into<String>,
    ) -> Self {
        Self::OutOfRange {
            entity: entity.into(),
            field: field.into(),
            value: value.into(),
        }
    }

    pub fn database_lookup(
        entity: impl Into<ImportEntity>,
        relation: impl Into<ImportRelation>,
        source_id: i32,
        source: DatabaseError,
    ) -> Self {
        Self::DatabaseLookup {
            entity: entity.into(),
            relation: relation.into(),
            source_id,
            source,
        }
    }

    pub fn database_write(
        entity: impl Into<ImportEntity>,
        source_id: Option<i32>,
        source: DatabaseError,
    ) -> Self {
        Self::DatabaseWrite {
            entity: entity.into(),
            source_id,
            source,
        }
    }

    pub fn import_failure(
        entity: impl Into<ImportEntity>,
        field: Option<ImportField>,
        source_id: Option<i32>,
        message: impl Into<String>,
    ) -> Self {
        Self::ImportFailure {
            entity: entity.into(),
            field,
            source_id,
            message: message.into(),
        }
    }
}

/// Enum for item-level issues like missing references or unexpected values.
/// These items still get logged in our DB, but the warning is recorded in the import_errors DB
/// table.
#[derive(Debug, Error)]
pub enum ImportItemWarning {
    #[error("{entity}.{field} has unexpected value {value:?}, defaulting to {fallback}")]
    UnexpectedFieldValue {
        entity: ImportEntity,
        field: ImportField,
        value: String,
        fallback: &'static str,
    },

    #[error("{entity} references missing optional {relation} source_id {source_id}")]
    MissingOptionalRelation {
        entity: ImportEntity,
        relation: ImportRelation,
        source_id: i32,
    },
}

impl ImportItemWarning {
    pub fn missing_optional_relation(
        entity: impl Into<ImportEntity>,
        relation: impl Into<ImportRelation>,
        source_id: i32,
    ) -> Self {
        Self::MissingOptionalRelation {
            entity: entity.into(),
            relation: relation.into(),
            source_id,
        }
    }

    pub fn to_import_error(&self, run_id: Uuid, item_source_id: Option<i32>) -> ImportErrorCreate {
        ImportErrorCreate {
            run_id: Some(run_id),
            severity: "warning".into(),
            entity: self.entity().into(),
            source_id: item_source_id,
            error_kind: self.kind().into(),
            field: self.field().map(Into::into),
            relation: self.relation().map(Into::into),
            relation_source_id: self.relation_source_id(),
            message: self.to_string(),
            payload: self.payload(),
        }
    }

    fn entity(&self) -> &'static str {
        match self {
            Self::UnexpectedFieldValue { entity, .. }
            | Self::MissingOptionalRelation { entity, .. } => entity.as_str(),
        }
    }

    fn kind(&self) -> &'static str {
        match self {
            Self::UnexpectedFieldValue { .. } => "unexpected_field_value",
            Self::MissingOptionalRelation { .. } => "missing_optional_relation",
        }
    }

    fn field(&self) -> Option<&'static str> {
        match self {
            Self::UnexpectedFieldValue { field, .. } => Some(field.as_str()),
            Self::MissingOptionalRelation { .. } => None,
        }
    }

    fn relation(&self) -> Option<&'static str> {
        match self {
            Self::MissingOptionalRelation { relation, .. } => Some(relation.as_str()),
            Self::UnexpectedFieldValue { .. } => None,
        }
    }

    fn relation_source_id(&self) -> Option<i32> {
        match self {
            Self::MissingOptionalRelation { source_id, .. } => Some(*source_id),
            Self::UnexpectedFieldValue { .. } => None,
        }
    }

    fn payload(&self) -> Option<serde_json::Value> {
        match self {
            Self::UnexpectedFieldValue {
                value, fallback, ..
            } => Some(serde_json::json!({
                "value": value,
                "fallback": fallback,
            })),
            Self::MissingOptionalRelation { .. } => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run_id() -> Uuid {
        Uuid::nil()
    }

    #[test]
    fn import_entities_have_stable_database_values() {
        let values = [
            (ImportEntity::Event, "event"),
            (ImportEntity::EventPrice, "event_price"),
            (ImportEntity::Gallery, "gallery"),
            (ImportEntity::Hall, "hall"),
            (ImportEntity::Location, "location"),
            (ImportEntity::Media, "media"),
            (ImportEntity::MediaVariant, "media_variant"),
            (ImportEntity::Price, "price"),
            (ImportEntity::PriceRank, "price_rank"),
            (ImportEntity::Production, "production"),
            (ImportEntity::Space, "space"),
        ];

        for (entity, value) in values {
            assert_eq!(entity.to_string(), value);
            assert_eq!(ImportEntity::from(value), entity);
        }
    }

    #[test]
    fn import_fields_have_stable_database_values() {
        let values = [
            (ImportField::Amount, "amount"),
            (ImportField::CdnUrl, "cdn_url"),
            (ImportField::Crop, "crop"),
            (ImportField::Event, "event"),
            (ImportField::Format, "format"),
            (ImportField::GalleryUrl, "gallery_url"),
            (ImportField::Location, "location"),
            (ImportField::MaxTicketsPerOrder, "max_tickets_per_order"),
            (ImportField::Name, "name"),
            (ImportField::OpenSeating, "open_seating"),
            (ImportField::Price, "price"),
            (ImportField::Production, "production"),
            (ImportField::Rank, "rank"),
            (ImportField::SeatSelection, "seat_selection"),
            (ImportField::SourceId, "source_id"),
            (ImportField::SourceUri, "source_uri"),
        ];

        for (field, value) in values {
            assert_eq!(field.to_string(), value);
            assert_eq!(ImportField::from(value), field);
        }
    }

    #[test]
    fn import_relations_have_stable_database_values() {
        let values = [
            (ImportRelation::Event, "event"),
            (ImportRelation::EventPrice, "event_price"),
            (ImportRelation::Gallery, "gallery"),
            (ImportRelation::Hall, "hall"),
            (ImportRelation::Location, "location"),
            (ImportRelation::Media, "media"),
            (ImportRelation::MediaVariant, "media_variant"),
            (ImportRelation::Price, "price"),
            (ImportRelation::PriceRank, "price_rank"),
            (ImportRelation::Production, "production"),
            (ImportRelation::Space, "space"),
        ];

        for (relation, value) in values {
            assert_eq!(relation.to_string(), value);
            assert_eq!(ImportRelation::from(value), relation);
        }
    }

    #[test]
    fn invalid_reference_maps_entity_kind_field_and_payload() {
        let err = ImportItemError::invalid_reference("space", "location", "/garbage");
        let record = err.to_import_error(run_id(), Some(99));

        assert_eq!(record.severity, "error");
        assert_eq!(record.entity, "space");
        assert_eq!(record.error_kind, "invalid_reference");
        assert_eq!(record.field.as_deref(), Some("location"));
        assert!(record.relation.is_none());
        assert!(record.relation_source_id.is_none());
        assert_eq!(record.source_id, Some(99));
        assert_eq!(
            record.payload,
            Some(serde_json::json!({ "value": "/garbage" }))
        );
    }

    #[test]
    fn missing_relation_maps_relation_and_relation_source_id() {
        let err = ImportItemError::missing_relation("space", "location", 7);
        let record = err.to_import_error(run_id(), Some(42));

        assert_eq!(record.entity, "space");
        assert_eq!(record.error_kind, "missing_relation");
        assert!(record.field.is_none());
        assert_eq!(record.relation.as_deref(), Some("location"));
        assert_eq!(record.relation_source_id, Some(7));
        // No payload when there's no value to attach.
        assert!(record.payload.is_none());
    }

    #[test]
    fn missing_required_field_maps_field_only() {
        let err = ImportItemError::missing_required_field("hall", "name");
        let record = err.to_import_error(run_id(), Some(1));

        assert_eq!(record.entity, "hall");
        assert_eq!(record.error_kind, "missing_required_field");
        assert_eq!(record.field.as_deref(), Some("name"));
        assert!(record.relation.is_none());
    }

    #[test]
    fn out_of_range_maps_field_and_payload() {
        let err = ImportItemError::out_of_range("event", "max_tickets_per_order", "9999999999");
        let record = err.to_import_error(run_id(), Some(100));

        assert_eq!(record.error_kind, "out_of_range");
        assert_eq!(record.field.as_deref(), Some("max_tickets_per_order"));
        assert_eq!(
            record.payload,
            Some(serde_json::json!({ "value": "9999999999" }))
        );
    }

    #[test]
    fn database_lookup_maps_relation_metadata() {
        let err = ImportItemError::database_lookup("space", "location", 5, DatabaseError::NotFound);
        let record = err.to_import_error(run_id(), None);

        assert_eq!(record.error_kind, "database_lookup");
        assert_eq!(record.relation.as_deref(), Some("location"));
        assert_eq!(record.relation_source_id, Some(5));
    }

    #[test]
    fn database_write_prefers_own_source_id_over_item_source_id() {
        let err = ImportItemError::database_write("space", Some(11), DatabaseError::NotFound);
        let record = err.to_import_error(run_id(), Some(99));

        assert_eq!(record.error_kind, "database_write");
        // The variant carries its own source_id, which should win over the item-level fallback.
        assert_eq!(record.source_id, Some(11));
    }

    #[test]
    fn database_write_falls_back_to_item_source_id() {
        let err = ImportItemError::database_write("space", None, DatabaseError::NotFound);
        let record = err.to_import_error(run_id(), Some(99));

        assert_eq!(record.source_id, Some(99));
    }

    #[test]
    fn import_failure_maps_entity_source_id_and_field() {
        let err = ImportItemError::import_failure(
            ImportEntity::Media,
            Some(ImportField::CdnUrl),
            Some(404),
            "download failed",
        );
        let record = err.to_import_error(run_id(), None);

        assert_eq!(record.entity, "media");
        assert_eq!(record.source_id, Some(404));
        assert_eq!(record.error_kind, "import_failure");
        assert_eq!(record.field.as_deref(), Some("cdn_url"));
        assert!(record.relation.is_none());
        assert!(record.payload.is_none());
    }

    #[test]
    fn warning_unexpected_field_value_maps_payload_with_value_and_fallback() {
        let warning = ImportItemWarning::UnexpectedFieldValue {
            entity: ImportEntity::Hall,
            field: ImportField::SeatSelection,
            value: "yes".into(),
            fallback: "false",
        };
        let record = warning.to_import_error(run_id(), Some(8));

        assert_eq!(record.severity, "warning");
        assert_eq!(record.entity, "hall");
        assert_eq!(record.error_kind, "unexpected_field_value");
        assert_eq!(record.field.as_deref(), Some("seat_selection"));
        assert_eq!(record.source_id, Some(8));
        assert_eq!(
            record.payload,
            Some(serde_json::json!({
                "value": "yes",
                "fallback": "false",
            }))
        );
    }

    #[test]
    fn warning_missing_optional_relation_maps_relation_metadata() {
        let warning = ImportItemWarning::missing_optional_relation("hall", "space", 4);
        let record = warning.to_import_error(run_id(), Some(8));

        assert_eq!(record.severity, "warning");
        assert_eq!(record.error_kind, "missing_optional_relation");
        assert_eq!(record.relation.as_deref(), Some("space"));
        assert_eq!(record.relation_source_id, Some(4));
        assert!(record.field.is_none());
        assert!(record.payload.is_none());
    }
}

impl std::fmt::Display for ImportEntity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::fmt::Display for ImportField {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::fmt::Display for ImportRelation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}
