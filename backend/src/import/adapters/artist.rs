use async_trait::async_trait;
use database::{
    Database,
    models::import_row::{DiffEntry, ImportWarning},
};
use serde_json::Value;
use slug::slugify;
use sqlx::{Postgres, Transaction};
use std::collections::BTreeMap;
use uuid::Uuid;

use crate::import::{
    trait_def::ImportableEntity,
    types::{FieldSpec, FieldType, RawRow, ReferenceResolution, ResolvedRow},
};

pub struct ArtistImport;

fn json_string(row: &ResolvedRow, key: &str) -> Option<String> {
    match row.get(key) {
        Some(Value::String(s)) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

#[async_trait]
impl ImportableEntity for ArtistImport {
    fn entity_type(&self) -> &'static str {
        "artist"
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![FieldSpec {
            name: "name".into(),
            label: "Name".into(),
            field_type: FieldType::String,
            required: true,
            unique_lookup: true,
        }]
    }

    async fn lookup_existing(
        &self,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<Option<Uuid>> {
        let Some(name) = json_string(row, "name") else {
            return Ok(None);
        };

        let name_lower = name.to_lowercase();
        let artists = db.artists().search(Some(&name)).await?;

        let best = artists
            .into_iter()
            .map(|a| {
                let score = strsim::jaro_winkler(&name_lower, &a.name.to_lowercase());
                (score, a.id)
            })
            .filter(|(score, _)| *score >= 0.92)
            .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        Ok(best.map(|(_, id)| id))
    }

    async fn resolve_references(
        &self,
        _row: &RawRow,
        _db: &Database,
    ) -> anyhow::Result<ReferenceResolution> {
        Ok(ReferenceResolution::default())
    }

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning> {
        let mut warnings = Vec::new();
        if json_string(row, "name").is_none() {
            warnings.push(ImportWarning {
                field: Some("name".into()),
                code: "required_missing".into(),
                message: "Required field 'name' is missing or empty.".into(),
            });
        }
        warnings
    }

    async fn build_diff(
        &self,
        entity_id: Uuid,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<BTreeMap<String, DiffEntry>> {
        let current = db.artists().by_id(entity_id).await?;
        let mut diff = BTreeMap::new();

        if let Some(incoming_name) = json_string(row, "name") {
            if current.name != incoming_name {
                diff.insert(
                    "name".to_string(),
                    DiffEntry {
                        current: Some(Value::String(current.name.clone())),
                        incoming: Some(Value::String(incoming_name)),
                    },
                );
            }
        }

        Ok(diff)
    }

    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid> {
        let name = json_string(row, "name").unwrap_or_else(|| "untitled".to_string());

        match existing_id {
            None => {
                let base_slug = slugify(&name);
                let slug = db.artists().find_unique_slug(&base_slug).await?;
                let artist = db.artists().insert_on(&mut *tx, &name, &slug).await?;
                Ok(artist.id)
            }
            Some(id) => {
                let current = db.artists().by_id(id).await?;
                let artist = db
                    .artists()
                    .update_on(&mut *tx, id, &name, &current.slug)
                    .await?;
                Ok(artist.id)
            }
        }
    }

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        db.artists().delete_on(&mut *tx, entity_id).await?;
        Ok(())
    }
}
