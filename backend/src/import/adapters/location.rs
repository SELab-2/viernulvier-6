use async_trait::async_trait;
use database::{
    Database,
    models::{
        import_row::{DiffEntry, ImportWarning},
        location::LocationCreate,
    },
};
use serde_json::Value;
use sqlx::{Postgres, Transaction};
use std::collections::BTreeMap;
use uuid::Uuid;

use crate::import::{
    adapters::source_id_from_value,
    trait_def::ImportableEntity,
    types::{FieldSpec, FieldType, RawRow, ReferenceResolution, ResolvedRow},
};

pub struct LocationImport;

fn json_string(row: &ResolvedRow, key: &str) -> Option<String> {
    match row.get(key) {
        Some(Value::String(s)) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

fn row_to_create(row: &ResolvedRow) -> LocationCreate {
    LocationCreate {
        source_id: row.get("source_id").and_then(source_id_from_value),
        name: json_string(row, "name"),
        code: json_string(row, "code"),
        street: json_string(row, "street"),
        number: json_string(row, "number"),
        postal_code: json_string(row, "postal_code"),
        city: json_string(row, "city"),
        country: json_string(row, "country"),
        phone_1: json_string(row, "phone_1"),
        phone_2: json_string(row, "phone_2"),
        is_owned_by_viernulvier: None,
        uitdatabank_id: None,
        slug: None,
    }
}

#[async_trait]
impl ImportableEntity for LocationImport {
    fn entity_type(&self) -> &'static str {
        "location"
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![
            FieldSpec {
                name: "source_id".into(),
                label: "Source ID".into(),
                field_type: FieldType::Integer,
                required: false,
                unique_lookup: true,
            },
            FieldSpec {
                name: "name".into(),
                label: "Name".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "city".into(),
                label: "City".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "street".into(),
                label: "Street".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "number".into(),
                label: "Number".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "postal_code".into(),
                label: "Postal code".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "country".into(),
                label: "Country".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "code".into(),
                label: "Code".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "phone_1".into(),
                label: "Phone 1".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "phone_2".into(),
                label: "Phone 2".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
        ]
    }

    async fn lookup_existing(
        &self,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<Option<Uuid>> {
        let Some(sid) = row.get("source_id").and_then(source_id_from_value) else {
            return Ok(None);
        };
        let loc = db.locations().by_source_id(sid).await?;
        Ok(loc.map(|l| l.id))
    }

    async fn resolve_references(
        &self,
        _row: &RawRow,
        _db: &Database,
    ) -> anyhow::Result<ReferenceResolution> {
        Ok(ReferenceResolution::default())
    }

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning> {
        let scalar_fields = [
            "source_id", "name", "city", "street", "number", "postal_code", "country", "code",
            "phone_1", "phone_2",
        ];
        let all_empty = scalar_fields.iter().all(|&f| match row.get(f) {
            None | Some(Value::Null) => true,
            Some(Value::String(s)) => s.is_empty(),
            _ => false,
        });
        if all_empty {
            return vec![ImportWarning {
                field: None,
                code: "empty_row".into(),
                message: "All location fields are empty.".into(),
            }];
        }
        vec![]
    }

    async fn build_diff(
        &self,
        entity_id: Uuid,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<BTreeMap<String, DiffEntry>> {
        let current = db.locations().by_id(entity_id).await?.location;
        let mut diff = BTreeMap::new();

        let mut maybe_diff = |key: &str, cur: Option<String>, inc: Option<String>| {
            if let Some(inc_val) = inc
                && cur.as_deref() != Some(inc_val.as_str())
            {
                diff.insert(
                    key.to_string(),
                    DiffEntry {
                        current: cur.map(Value::String),
                        incoming: Some(Value::String(inc_val)),
                    },
                );
            }
        };

        maybe_diff("name", current.name.clone(), json_string(row, "name"));
        maybe_diff("city", current.city.clone(), json_string(row, "city"));
        maybe_diff("street", current.street.clone(), json_string(row, "street"));
        maybe_diff("number", current.number.clone(), json_string(row, "number"));
        maybe_diff(
            "postal_code",
            current.postal_code.clone(),
            json_string(row, "postal_code"),
        );
        maybe_diff(
            "country",
            current.country.clone(),
            json_string(row, "country"),
        );
        maybe_diff("code", current.code.clone(), json_string(row, "code"));
        maybe_diff(
            "phone_1",
            current.phone_1.clone(),
            json_string(row, "phone_1"),
        );
        maybe_diff(
            "phone_2",
            current.phone_2.clone(),
            json_string(row, "phone_2"),
        );

        Ok(diff)
    }

    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid> {
        match existing_id {
            None => {
                let create = row_to_create(row);
                let location = db.locations().insert_on(&mut *tx, create).await?;
                Ok(location.id)
            }
            Some(id) => {
                let current = db.locations().by_id(id).await?.location;
                let incoming = row_to_create(row);
                let updated = database::models::location::Location {
                    id: current.id,
                    source_id: incoming.source_id.or(current.source_id),
                    name: incoming.name.or(current.name),
                    code: incoming.code.or(current.code),
                    street: incoming.street.or(current.street),
                    number: incoming.number.or(current.number),
                    postal_code: incoming.postal_code.or(current.postal_code),
                    city: incoming.city.or(current.city),
                    country: incoming.country.or(current.country),
                    phone_1: incoming.phone_1.or(current.phone_1),
                    phone_2: incoming.phone_2.or(current.phone_2),
                    is_owned_by_viernulvier: current.is_owned_by_viernulvier,
                    uitdatabank_id: current.uitdatabank_id,
                    slug: current.slug,
                };
                let location = db.locations().update_on(&mut *tx, updated).await?;
                Ok(location.id)
            }
        }
    }

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        db.locations().delete_on(&mut *tx, entity_id).await?;
        Ok(())
    }
}
