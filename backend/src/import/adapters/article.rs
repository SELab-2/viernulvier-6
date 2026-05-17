use async_trait::async_trait;
use chrono::{NaiveDate, Utc};
use database::{
    Database,
    models::{
        article::{Article, ArticleCreate, ArticleStatus},
        import_row::{DiffEntry, ImportWarning},
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

pub struct ArticleImport;

fn json_string(row: &ResolvedRow, key: &str) -> Option<String> {
    match row.get(key) {
        Some(Value::String(s)) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

fn parse_status(s: &str) -> Option<ArticleStatus> {
    match s.trim().to_lowercase().as_str() {
        "draft" => Some(ArticleStatus::Draft),
        "published" => Some(ArticleStatus::Published),
        "archived" => Some(ArticleStatus::Archived),
        _ => None,
    }
}

fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok()
}

#[async_trait]
impl ImportableEntity for ArticleImport {
    fn entity_type(&self) -> &'static str {
        "article"
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![
            FieldSpec {
                name: "title".into(),
                label: "Title".into(),
                field_type: FieldType::String,
                required: true,
                unique_lookup: false,
            },
            FieldSpec {
                name: "slug".into(),
                label: "Slug".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: true,
            },
            FieldSpec {
                name: "status".into(),
                label: "Status (draft/published/archived)".into(),
                field_type: FieldType::String,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "subject_period_start".into(),
                label: "Subject period start (YYYY-MM-DD)".into(),
                field_type: FieldType::Date,
                required: false,
                unique_lookup: false,
            },
            FieldSpec {
                name: "subject_period_end".into(),
                label: "Subject period end (YYYY-MM-DD)".into(),
                field_type: FieldType::Date,
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
        let Some(slug) = json_string(row, "slug") else {
            return Ok(None);
        };
        match db.articles().by_slug(&slug).await {
            Ok(article) => Ok(Some(article.id)),
            Err(database::error::DatabaseError::NotFound) => Ok(None),
            Err(e) => Err(e.into()),
        }
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

        if json_string(row, "title").is_none() {
            warnings.push(ImportWarning {
                field: Some("title".into()),
                code: "required_missing".into(),
                message: "Required field 'title' is missing or empty.".into(),
            });
        }

        if let Some(s) = json_string(row, "status")
            && parse_status(&s).is_none()
        {
            warnings.push(ImportWarning {
                field: Some("status".into()),
                code: "invalid_value".into(),
                message: format!(
                    "Field 'status' must be 'draft', 'published', or 'archived'; got '{s}'."
                ),
            });
        }

        for date_field in ["subject_period_start", "subject_period_end"] {
            if let Some(s) = json_string(row, date_field)
                && parse_date(&s).is_none()
            {
                warnings.push(ImportWarning {
                    field: Some(date_field.into()),
                    code: "invalid_date".into(),
                    message: format!(
                        "Field '{date_field}' could not be parsed as a date (YYYY-MM-DD): '{s}'."
                    ),
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
        let current = db.articles().by_id(entity_id).await?;
        let mut diff = BTreeMap::new();

        let mut maybe_diff_str = |key: &str, cur: Option<String>, inc: Option<String>| {
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

        maybe_diff_str("title", current.title.clone(), json_string(row, "title"));
        maybe_diff_str(
            "status",
            Some(format!("{:?}", current.status).to_lowercase()),
            json_string(row, "status").map(|s| s.to_lowercase()),
        );
        maybe_diff_str(
            "subject_period_start",
            current
                .subject_period_start
                .map(|d| d.format("%Y-%m-%d").to_string()),
            json_string(row, "subject_period_start"),
        );
        maybe_diff_str(
            "subject_period_end",
            current
                .subject_period_end
                .map(|d| d.format("%Y-%m-%d").to_string()),
            json_string(row, "subject_period_end"),
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
        let title = json_string(row, "title");
        let status = json_string(row, "status")
            .and_then(|s| parse_status(&s))
            .unwrap_or(ArticleStatus::Draft);
        let subject_period_start = json_string(row, "subject_period_start")
            .and_then(|s| parse_date(&s));
        let subject_period_end = json_string(row, "subject_period_end")
            .and_then(|s| parse_date(&s));

        match existing_id {
            None => {
                let raw_slug = json_string(row, "slug")
                    .or_else(|| title.as_deref().map(slugify))
                    .unwrap_or_else(|| "untitled".to_string());

                // Slug uniqueness reads stay on db (commits are serial per-row).
                let slug = if db.articles().slug_exists(&raw_slug).await? {
                    let mut n = 2u32;
                    loop {
                        let candidate = format!("{raw_slug}-{n}");
                        if !db.articles().slug_exists(&candidate).await? {
                            break candidate;
                        }
                        n += 1;
                        if n > 99 {
                            anyhow::bail!("could not generate a unique slug for '{raw_slug}'");
                        }
                    }
                } else {
                    raw_slug
                };

                let article = db
                    .articles()
                    .insert_on(
                        &mut *tx,
                        ArticleCreate {
                            slug,
                            status: status.clone(),
                            title,
                            content: None,
                            subject_period_start,
                            subject_period_end,
                            created_at: Utc::now(),
                            updated_at: Utc::now(),
                            published_at: if matches!(status, ArticleStatus::Published) {
                                Some(Utc::now())
                            } else {
                                None
                            },
                        },
                    )
                    .await?;
                Ok(article.id)
            }
            Some(id) => {
                let current = db.articles().by_id(id).await?;
                let updated = Article {
                    id: current.id,
                    created_at: current.created_at,
                    updated_at: current.updated_at,
                    published_at: current.published_at,
                    slug: current.slug,
                    status,
                    title: title.or(current.title),
                    content: current.content,
                    subject_period_start: subject_period_start.or(current.subject_period_start),
                    subject_period_end: subject_period_end.or(current.subject_period_end),
                };
                let article = db.articles().update_on(&mut *tx, updated).await?;
                Ok(article.id)
            }
        }
    }

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        db.articles().delete_on(&mut *tx, entity_id).await?;
        Ok(())
    }
}
