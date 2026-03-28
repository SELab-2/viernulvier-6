use chrono::{DateTime, NaiveDate, Utc};
use database::{
    Database,
    models::article::{Article, ArticleCreate, ArticleRelations, ArticleStatus},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

// ─── ArticlePayload ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticlePayload {
    pub id: Uuid,
    pub slug: String,
    pub status: ArticleStatus,
    pub title_nl: Option<String>,
    pub title_en: Option<String>,
    pub content: Option<Value>,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub subject_period_start: Option<NaiveDate>,
    pub subject_period_end: Option<NaiveDate>,
}

impl From<Article> for ArticlePayload {
    fn from(a: Article) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            status: a.status,
            title_nl: a.title_nl,
            title_en: a.title_en,
            content: a.content,
            published_at: a.published_at,
            created_at: a.created_at,
            updated_at: a.updated_at,
            subject_period_start: a.subject_period_start,
            subject_period_end: a.subject_period_end,
        }
    }
}

impl ArticlePayload {
    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.articles().by_id(id).await?.into())
    }

    pub async fn by_slug(db: &Database, slug: &str) -> Result<Self, AppError> {
        Ok(db.articles().by_slug(slug).await?.into())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        Ok(db.articles().update(self.into()).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.articles().delete(id).await?)
    }
}

impl From<ArticlePayload> for Article {
    fn from(p: ArticlePayload) -> Self {
        Self {
            id: p.id,
            slug: p.slug,
            status: p.status,
            title_nl: p.title_nl,
            title_en: p.title_en,
            content: p.content,
            published_at: p.published_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
            subject_period_start: p.subject_period_start,
            subject_period_end: p.subject_period_end,
        }
    }
}

// ─── ArticleListPayload ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticleListPayload {
    pub id: Uuid,
    pub slug: String,
    pub status: ArticleStatus,
    pub title_nl: Option<String>,
    pub title_en: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

impl From<Article> for ArticleListPayload {
    fn from(a: Article) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            status: a.status,
            title_nl: a.title_nl,
            title_en: a.title_en,
            published_at: a.published_at,
            updated_at: a.updated_at,
        }
    }
}

impl ArticleListPayload {
    pub async fn all_cms(db: &Database) -> Result<Vec<Self>, AppError> {
        Ok(db.articles().all().await?.into_iter().map(Self::from).collect())
    }

    pub async fn list_published(
        db: &Database,
        subject_start: Option<NaiveDate>,
        subject_end: Option<NaiveDate>,
        tag_slug: Option<String>,
        related_entity_id: Option<Uuid>,
        related_entity_type: Option<String>,
    ) -> Result<Vec<Self>, AppError> {
        Ok(db
            .articles()
            .list_published(subject_start, subject_end, tag_slug, related_entity_id, related_entity_type)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }
}

// ─── ArticlePostPayload ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticlePostPayload {
    pub title_nl: Option<String>,
}

fn slugify(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

impl ArticlePostPayload {
    pub async fn create(self, db: &Database) -> Result<ArticlePayload, AppError> {
        let base_slug = match &self.title_nl {
            Some(t) if !t.is_empty() => slugify(t),
            _ => "article".to_string(),
        };

        // Find a unique slug
        let slug = if !db.articles().slug_exists(&base_slug).await? {
            base_slug.clone()
        } else {
            let mut n = 2u32;
            loop {
                let candidate = format!("{base_slug}-{n}");
                if !db.articles().slug_exists(&candidate).await? {
                    break candidate;
                }
                n += 1;
            }
        };

        let now = Utc::now();
        let create = ArticleCreate {
            slug,
            status: ArticleStatus::Draft,
            title_nl: self.title_nl,
            title_en: None,
            content: None,
            subject_period_start: None,
            subject_period_end: None,
            created_at: now,
            updated_at: now,
            published_at: None,
        };

        Ok(db.articles().insert(create).await?.into())
    }
}

// ─── ArticleRelationsPayload ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticleRelationsPayload {
    pub production_ids: Vec<Uuid>,
    pub artist_ids: Vec<Uuid>,
    pub location_ids: Vec<Uuid>,
    pub event_ids: Vec<Uuid>,
}

impl From<ArticleRelations> for ArticleRelationsPayload {
    fn from(r: ArticleRelations) -> Self {
        Self {
            production_ids: r.production_ids,
            artist_ids: r.artist_ids,
            location_ids: r.location_ids,
            event_ids: r.event_ids,
        }
    }
}

impl From<ArticleRelationsPayload> for ArticleRelations {
    fn from(p: ArticleRelationsPayload) -> Self {
        Self {
            production_ids: p.production_ids,
            artist_ids: p.artist_ids,
            location_ids: p.location_ids,
            event_ids: p.event_ids,
        }
    }
}

impl ArticleRelationsPayload {
    pub async fn get(db: &Database, article_id: Uuid) -> Result<Self, AppError> {
        Ok(db.articles().get_relations(article_id).await?.into())
    }

    pub async fn set(self, db: &Database, article_id: Uuid) -> Result<Self, AppError> {
        Ok(db.articles().set_relations(article_id, self.into()).await?.into())
    }
}
