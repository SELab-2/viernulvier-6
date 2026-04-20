use async_trait::async_trait;
use database::{
    Database,
    models::{
        import_row::{DiffEntry, ImportWarning},
        production::{ProductionCreate, ProductionTranslationData},
    },
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

pub struct ProductionImport;

// ─── helper ──────────────────────────────────────────────────────────────────

/// Return `Some(owned string)` only when key is present, not null, and not empty.
fn json_string(row: &ResolvedRow, key: &str) -> Option<String> {
    match row.get(key) {
        Some(Value::String(s)) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

// ─── trait impl ──────────────────────────────────────────────────────────────

#[async_trait]
impl ImportableEntity for ProductionImport {
    fn entity_type(&self) -> &'static str {
        "production"
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![
            FieldSpec {
                name: "title_nl".into(),
                label: "Title (NL)".into(),
                field_type: FieldType::String,
                required: true,
                unique_lookup: false,
            },
            FieldSpec {
                name: "supertitle_nl".into(),
                label: "Supertitle (NL)".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "description_nl".into(),
                label: "Description (NL)".into(),
                field_type: FieldType::Text,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "description_en".into(),
                label: "Description (EN)".into(),
                field_type: FieldType::Text,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "uitdatabank_theme".into(),
                label: "Theme / Genre".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "source_id".into(),
                label: "Source ID".into(),
                field_type: FieldType::Integer,
                required: false,
                unique_lookup: true,
            },
        ]
    }

    async fn lookup_existing(
        &self,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<Option<Uuid>> {
        let Some(v) = row.get("source_id") else {
            return Ok(None);
        };
        let Some(n) = v.as_i64() else {
            return Ok(None);
        };
        let Ok(sid) = i32::try_from(n) else {
            return Ok(None);
        };
        let prod = db.productions().by_source_id(sid).await?;
        Ok(prod.map(|p| p.production.id))
    }

    async fn resolve_references(
        &self,
        _row: &RawRow,
        _db: &Database,
    ) -> anyhow::Result<ReferenceResolution> {
        // Productions have no FK columns in v1.
        Ok(ReferenceResolution::default())
    }

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning> {
        let mut warnings = Vec::new();
        for field in self.target_fields() {
            if !field.required {
                continue;
            }
            let missing = match row.get(&field.name) {
                None | Some(Value::Null) => true,
                Some(Value::String(s)) if s.is_empty() => true,
                _ => false,
            };
            if missing {
                warnings.push(ImportWarning {
                    field: Some(field.name.clone()),
                    code: "required_missing".into(),
                    message: format!("Required field '{}' is missing or empty.", field.name),
                });
            }
        }
        warnings
    }

    async fn build_diff(
        &self,
        entity_id: Uuid,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<BTreeMap<String, DiffEntry>> {
        let current = db.productions().by_id(entity_id).await?;
        let prod = &current.production;
        let nl_trans = current.translations.iter().find(|t| t.language_code == "nl");

        let mut diff = BTreeMap::new();

        // Helper: push entry if current != incoming (and incoming is present).
        let mut maybe_diff = |key: &str, cur: Option<Value>, inc: Option<Value>| {
            if let Some(inc_val) = inc
                && cur.as_ref() != Some(&inc_val)
            {
                diff.insert(
                    key.to_string(),
                    DiffEntry {
                        current: cur,
                        incoming: Some(inc_val),
                    },
                );
            }
        };

        // Production-level fields
        maybe_diff(
            "uitdatabank_theme",
            prod.uitdatabank_theme.as_ref().map(|s| Value::String(s.clone())),
            json_string(row, "uitdatabank_theme").map(Value::String),
        );

        // NL translation fields
        maybe_diff(
            "title_nl",
            nl_trans.and_then(|t| t.title.as_ref()).map(|s| Value::String(s.clone())),
            json_string(row, "title_nl").map(Value::String),
        );
        maybe_diff(
            "supertitle_nl",
            nl_trans.and_then(|t| t.supertitle.as_ref()).map(|s| Value::String(s.clone())),
            json_string(row, "supertitle_nl").map(Value::String),
        );
        maybe_diff(
            "description_nl",
            nl_trans.and_then(|t| t.description.as_ref()).map(|s| Value::String(s.clone())),
            json_string(row, "description_nl").map(Value::String),
        );
        maybe_diff(
            "description_en",
            // EN description from existing translations
            current
                .translations
                .iter()
                .find(|t| t.language_code == "en")
                .and_then(|t| t.description.as_ref())
                .map(|s| Value::String(s.clone())),
            json_string(row, "description_en").map(Value::String),
        );

        Ok(diff)
    }

    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        // v1: writes committed directly via pool; transactional adapters are future work.
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid> {
        let title_nl = json_string(row, "title_nl");
        let supertitle_nl = json_string(row, "supertitle_nl");
        let description_nl = json_string(row, "description_nl");
        let description_en = json_string(row, "description_en");
        let uitdatabank_theme = json_string(row, "uitdatabank_theme");
        let source_id = row
            .get("source_id")
            .and_then(Value::as_i64)
            .and_then(|n| i32::try_from(n).ok());

        // Build NL translation data, merging with existing on update.
        let nl_data = |existing_nl: Option<&database::models::production::ProductionTranslation>| {
            ProductionTranslationData {
                language_code: "nl".to_string(),
                title: title_nl.clone().or_else(|| {
                    existing_nl.and_then(|t| t.title.clone())
                }),
                supertitle: supertitle_nl.clone().or_else(|| {
                    existing_nl.and_then(|t| t.supertitle.clone())
                }),
                description: description_nl.clone().or_else(|| {
                    existing_nl.and_then(|t| t.description.clone())
                }),
                // carry over the rest untouched
                artist: existing_nl.and_then(|t| t.artist.clone()),
                meta_title: existing_nl.and_then(|t| t.meta_title.clone()),
                meta_description: existing_nl.and_then(|t| t.meta_description.clone()),
                tagline: existing_nl.and_then(|t| t.tagline.clone()),
                teaser: existing_nl.and_then(|t| t.teaser.clone()),
                description_extra: existing_nl.and_then(|t| t.description_extra.clone()),
                description_2: existing_nl.and_then(|t| t.description_2.clone()),
                quote: existing_nl.and_then(|t| t.quote.clone()),
                quote_source: existing_nl.and_then(|t| t.quote_source.clone()),
                programme: existing_nl.and_then(|t| t.programme.clone()),
                info: existing_nl.and_then(|t| t.info.clone()),
                description_short: existing_nl.and_then(|t| t.description_short.clone()),
            }
        };

        match existing_id {
            None => {
                // Create path: generate slug from title.
                let slug = title_nl
                    .as_deref()
                    .map(slugify)
                    .unwrap_or_else(|| "untitled".to_string());

                let mut translations = vec![nl_data(None)];
                if let Some(desc_en) = description_en.clone() {
                    translations.push(ProductionTranslationData {
                        language_code: "en".to_string(),
                        description: Some(desc_en),
                        title: None,
                        supertitle: None,
                        artist: None,
                        meta_title: None,
                        meta_description: None,
                        tagline: None,
                        teaser: None,
                        description_extra: None,
                        description_2: None,
                        quote: None,
                        quote_source: None,
                        programme: None,
                        info: None,
                        description_short: None,
                    });
                }

                let result = db
                    .productions()
                    .insert(
                        ProductionCreate {
                            source_id,
                            slug,
                            video_1: None,
                            video_2: None,
                            eticket_info: None,
                            uitdatabank_theme,
                            uitdatabank_type: None,
                        },
                        translations,
                    )
                    .await?;

                Ok(result.production.id)
            }
            Some(id) => {
                // Update path: load current, preserve slug and unrelated fields.
                let current = db.productions().by_id(id).await?;
                let existing_nl =
                    current.translations.iter().find(|t| t.language_code == "nl");
                let existing_en =
                    current.translations.iter().find(|t| t.language_code == "en");

                let updated_production = database::models::production::Production {
                    id: current.production.id,
                    slug: current.production.slug.clone(), // stable URL: never re-slug on rename
                    source_id: source_id.or(current.production.source_id),
                    video_1: current.production.video_1.clone(),
                    video_2: current.production.video_2.clone(),
                    eticket_info: current.production.eticket_info.clone(),
                    uitdatabank_theme: uitdatabank_theme.or(current.production.uitdatabank_theme.clone()),
                    uitdatabank_type: current.production.uitdatabank_type.clone(),
                };

                let mut translations = vec![nl_data(existing_nl)];

                // EN: carry over existing, overwrite description if incoming present.
                let en_desc = description_en.clone().or_else(|| {
                    existing_en.and_then(|t| t.description.clone())
                });
                if en_desc.is_some() || existing_en.is_some() {
                    translations.push(ProductionTranslationData {
                        language_code: "en".to_string(),
                        description: en_desc,
                        title: existing_en.and_then(|t| t.title.clone()),
                        supertitle: existing_en.and_then(|t| t.supertitle.clone()),
                        artist: existing_en.and_then(|t| t.artist.clone()),
                        meta_title: existing_en.and_then(|t| t.meta_title.clone()),
                        meta_description: existing_en.and_then(|t| t.meta_description.clone()),
                        tagline: existing_en.and_then(|t| t.tagline.clone()),
                        teaser: existing_en.and_then(|t| t.teaser.clone()),
                        description_extra: existing_en.and_then(|t| t.description_extra.clone()),
                        description_2: existing_en.and_then(|t| t.description_2.clone()),
                        quote: existing_en.and_then(|t| t.quote.clone()),
                        quote_source: existing_en.and_then(|t| t.quote_source.clone()),
                        programme: existing_en.and_then(|t| t.programme.clone()),
                        info: existing_en.and_then(|t| t.info.clone()),
                        description_short: existing_en.and_then(|t| t.description_short.clone()),
                    });
                }

                let result = db
                    .productions()
                    .update(updated_production, translations)
                    .await?;

                Ok(result.production.id)
            }
        }
    }

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        // v1: revert assumes Created semantics; ignores tx (pool writes).
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        db.productions().delete(entity_id).await?;
        Ok(())
    }
}
