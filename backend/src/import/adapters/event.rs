use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use database::{
    Database,
    models::{
        event::{Event, EventCreate},
        filtering::{facets::FacetFilters, sort::Sort},
        hall::HallSearch,
        import_row::{DiffEntry, ImportWarning},
        production::ProductionFilters,
    },
};
use serde_json::Value;
use sqlx::{Postgres, Transaction};
use std::collections::BTreeMap;
use uuid::Uuid;

use crate::import::{
    trait_def::ImportableEntity,
    types::{FieldSpec, FieldType, RawRow, ReferenceSuggestion, ReferenceResolution, ResolvedRow},
};

pub struct EventImport;

// ─── helpers ──────────────────────────────────────────────────────────────────

/// Parse a datetime from either RFC3339 or `"YYYY-MM-DD HH:MM:SS"` format.
fn parse_datetime(s: &str) -> Option<DateTime<Utc>> {
    // Try RFC3339 first (preferred).
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.into());
    }
    // Fall back to naive local format and treat as UTC.
    NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
        .ok()
        .map(|ndt| Utc.from_utc_datetime(&ndt))
}

/// Fuzzy-match `input` against all halls in the database.
/// Returns up to `limit` suggestions sorted by descending Jaro-Winkler score.
async fn fuzzy_match_halls(
    db: &Database,
    input: &str,
    limit: usize,
) -> anyhow::Result<Vec<ReferenceSuggestion>> {
    // Fetch all halls (small table — no pagination needed).
    let (halls, _) = db
        .halls()
        .all(10_000, None, HallSearch { q: None })
        .await?;

    let input_lower = input.to_lowercase();
    let mut scored: Vec<(f64, Uuid, String)> = halls
        .into_iter()
        .map(|h| {
            let score = strsim::jaro_winkler(&input_lower, &h.name.to_lowercase());
            (score, h.id, h.name)
        })
        .collect();

    // Sort descending by score, then stable by id for determinism.
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(limit);

    Ok(scored
        .into_iter()
        .map(|(score, id, label)| ReferenceSuggestion {
            id,
            label,
            #[allow(clippy::cast_possible_truncation)]
            score: score as f32,
        })
        .collect())
}

/// Fuzzy-match `input` against all productions (using NL title) in the database.
/// Returns up to `limit` suggestions sorted by descending Jaro-Winkler score.
async fn fuzzy_match_productions(
    db: &Database,
    input: &str,
    limit: usize,
) -> anyhow::Result<Vec<ReferenceSuggestion>> {
    // Fetch all productions with translations, using a generous page size.
    // Productions is a larger table but we need title data which lives in translations.
    let (productions, _) = db
        .productions()
        .all(
            10_000,
            None,
            ProductionFilters {
                search: None,
                facets: FacetFilters {
                    disciplines: None,
                    formats: None,
                    themes: None,
                    audiences: None,
                },
                locations: None,
                date_from: None,
                date_to: None,
                sort: Sort::Recent,
            },
        )
        .await?;

    let input_lower = input.to_lowercase();
    let mut scored: Vec<(f64, Uuid, String)> = productions
        .into_iter()
        .filter_map(|p| {
            // Use the NL title; skip entries without one.
            let title = p
                .translations
                .iter()
                .find(|t| t.language_code == "nl")
                .and_then(|t| t.title.clone())?;
            let score = strsim::jaro_winkler(&input_lower, &title.to_lowercase());
            Some((score, p.production.id, title))
        })
        .collect();

    // Sort descending by score, then stable by id for determinism.
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(limit);

    Ok(scored
        .into_iter()
        .map(|(score, id, label)| ReferenceSuggestion {
            id,
            label,
            #[allow(clippy::cast_possible_truncation)]
            score: score as f32,
        })
        .collect())
}

// ─── trait impl ──────────────────────────────────────────────────────────────

#[async_trait]
impl ImportableEntity for EventImport {
    fn entity_type(&self) -> &'static str {
        "event"
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![
            FieldSpec {
                name: "start_time".into(),
                label: "Start time".into(),
                field_type: FieldType::DateTime,
                required: true,
                unique_lookup: false,
            },
            FieldSpec {
                name: "end_time".into(),
                label: "End time".into(),
                field_type: FieldType::DateTime,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "hall_id".into(),
                label: "Hall".into(),
                field_type: FieldType::ForeignKey {
                    target: "hall".into(),
                    match_field: "name".into(),
                },
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "production_id".into(),
                label: "Production".into(),
                field_type: FieldType::ForeignKey {
                    target: "production".into(),
                    match_field: "title".into(),
                },
                required: true,
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
        let event = db.events().by_source_id(sid).await?;
        Ok(event.map(|e| e.id))
    }

    async fn resolve_references(
        &self,
        row: &RawRow,
        db: &Database,
    ) -> anyhow::Result<ReferenceResolution> {
        let mut out = ReferenceResolution::default();

        if let Some(Some(name)) = row.get("hall_id") {
            out.per_column
                .insert("hall_id".into(), fuzzy_match_halls(db, name, 3).await?);
        }

        if let Some(Some(title)) = row.get("production_id") {
            out.per_column.insert(
                "production_id".into(),
                fuzzy_match_productions(db, title, 3).await?,
            );
        }

        Ok(out)
    }

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning> {
        let mut warnings = Vec::new();

        // Validate start_time: required and must parse as a datetime.
        match row.get("start_time") {
            None | Some(Value::Null) => {
                warnings.push(ImportWarning {
                    field: Some("start_time".into()),
                    code: "invalid_datetime".into(),
                    message: "Required field 'start_time' is missing.".into(),
                });
            }
            Some(Value::String(s)) if parse_datetime(s).is_none() => {
                warnings.push(ImportWarning {
                    field: Some("start_time".into()),
                    code: "invalid_datetime".into(),
                    message: format!("Field 'start_time' could not be parsed as a datetime: '{s}'."),
                });
            }
            _ => {}
        }

        // Validate production_id: required and, once resolved, must be a valid UUID.
        match row.get("production_id") {
            None | Some(Value::Null) => {
                warnings.push(ImportWarning {
                    field: Some("production_id".into()),
                    code: "unresolved_reference".into(),
                    message: "Required field 'production_id' is missing.".into(),
                });
            }
            Some(Value::String(s)) if Uuid::parse_str(s).is_err() => {
                warnings.push(ImportWarning {
                    field: Some("production_id".into()),
                    code: "unresolved_reference".into(),
                    message: format!(
                        "Field 'production_id' is not a valid UUID (unresolved reference): '{s}'."
                    ),
                });
            }
            _ => {}
        }

        // Validate hall_id: optional, but if present must be a valid UUID.
        if let Some(Value::String(s)) = row.get("hall_id")
            && Uuid::parse_str(s).is_err()
        {
            warnings.push(ImportWarning {
                field: Some("hall_id".into()),
                code: "unresolved_reference".into(),
                message: format!(
                    "Field 'hall_id' is not a valid UUID (unresolved reference): '{s}'."
                ),
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
        let current = db.events().by_id(entity_id).await?;
        let mut diff = BTreeMap::new();

        // Helper: emit DiffEntry only when incoming is present and differs from current.
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

        // source_id
        maybe_diff(
            "source_id",
            current.source_id.map(|n| Value::Number(n.into())),
            row.get("source_id")
                .and_then(Value::as_i64)
                .and_then(|n| i32::try_from(n).ok())
                .map(|n| Value::Number(n.into())),
        );

        // start_time — serialize as RFC3339.
        maybe_diff(
            "start_time",
            Some(Value::String(current.starts_at.to_rfc3339())),
            row.get("start_time").and_then(|v| {
                if let Value::String(s) = v {
                    parse_datetime(s).map(|dt| Value::String(dt.to_rfc3339()))
                } else {
                    None
                }
            }),
        );

        // end_time — optional.
        maybe_diff(
            "end_time",
            current.ends_at.map(|dt| Value::String(dt.to_rfc3339())),
            row.get("end_time").and_then(|v| {
                if let Value::String(s) = v {
                    parse_datetime(s).map(|dt| Value::String(dt.to_rfc3339()))
                } else {
                    None
                }
            }),
        );

        // production_id
        maybe_diff(
            "production_id",
            Some(Value::String(current.production_id.to_string())),
            row.get("production_id").and_then(|v| {
                if let Value::String(s) = v {
                    Uuid::parse_str(s).ok().map(|u| Value::String(u.to_string()))
                } else {
                    None
                }
            }),
        );

        // hall_id — optional.
        maybe_diff(
            "hall_id",
            current.hall_id.map(|u| Value::String(u.to_string())),
            row.get("hall_id").and_then(|v| {
                if let Value::String(s) = v {
                    Uuid::parse_str(s).ok().map(|u| Value::String(u.to_string()))
                } else {
                    None
                }
            }),
        );

        Ok(diff)
    }

    /// v1: writes committed directly; transactional adapters are future work.
    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid> {
        // Parse required fields.
        let starts_at = match row.get("start_time") {
            Some(Value::String(s)) => parse_datetime(s)
                .ok_or_else(|| anyhow::anyhow!("start_time is not a valid datetime: '{s}'"))?,
            _ => anyhow::bail!("start_time is missing or not a string"),
        };

        let production_id = match row.get("production_id") {
            Some(Value::String(s)) => Uuid::parse_str(s)
                .map_err(|_| anyhow::anyhow!("production_id is not a valid UUID: '{s}'"))?,
            _ => anyhow::bail!("production_id is missing or not a string"),
        };

        // Parse optional fields.
        let ends_at = match row.get("end_time") {
            Some(Value::String(s)) => parse_datetime(s),
            _ => None,
        };

        let hall_id = match row.get("hall_id") {
            Some(Value::String(s)) => Uuid::parse_str(s).ok(),
            _ => None,
        };

        let source_id = row
            .get("source_id")
            .and_then(Value::as_i64)
            .and_then(|n| i32::try_from(n).ok());

        match existing_id {
            None => {
                let now = Utc::now();
                let event_create = EventCreate {
                    source_id,
                    created_at: now,
                    updated_at: now,
                    starts_at,
                    ends_at,
                    intermission_at: None,
                    doors_at: None,
                    vendor_id: None,
                    box_office_id: None,
                    uitdatabank_id: None,
                    max_tickets_per_order: None,
                    production_id,
                    status: "scheduled".into(),
                    hall_id,
                };
                let event = db.events().insert(event_create).await?;
                Ok(event.id)
            }
            Some(id) => {
                let existing = db.events().by_id(id).await?;
                // Preserve source_id from existing record — do not override on update.
                let updated = Event {
                    starts_at,
                    ends_at,
                    production_id,
                    hall_id,
                    ..existing
                };
                let event = db.events().update(updated).await?;
                Ok(event.id)
            }
        }
    }

    /// v1: writes committed directly; transactional adapters are future work.
    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        db.events().delete(entity_id).await?;
        Ok(())
    }
}
