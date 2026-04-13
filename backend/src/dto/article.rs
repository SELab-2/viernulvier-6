use chrono::{DateTime, NaiveDate, Utc};
use base64::{Engine, prelude::BASE64_URL_SAFE};
use database::{
    Database,
    models::{article::{Article, ArticleCreate, ArticleRelations, ArticleSearch, ArticleStatus}, cursor::CursorData},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use uuid::Uuid;

use slug::slugify;

use crate::{dto::paginated::PaginatedResponse, error::AppError};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticlePayload {
    pub id: Uuid,
    pub slug: String,
    pub status: ArticleStatus,
    pub title: Option<String>,
    pub content: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub subject_period_start: Option<NaiveDate>,
    pub subject_period_end: Option<NaiveDate>,
}

impl From<Article> for ArticlePayload {
    fn from(a: Article) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            status: a.status,
            title: a.title,
            content: a.content,
            created_at: a.created_at,
            updated_at: a.updated_at,
            published_at: a.published_at,
            subject_period_start: a.subject_period_start,
            subject_period_end: a.subject_period_end,
        }
    }
}

impl ArticlePayload {
    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.articles().by_id(id).await?.into())
    }

    pub async fn by_slug_published(db: &Database, slug: &str) -> Result<Self, AppError> {
        Ok(db.articles().by_slug_published(slug).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.articles().delete(id).await?)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticleUpdatePayload {
    pub slug: String,
    pub status: ArticleStatus,
    pub title: Option<String>,
    pub content: Option<Value>,
    pub subject_period_start: Option<NaiveDate>,
    pub subject_period_end: Option<NaiveDate>,
}

impl ArticleUpdatePayload {
    pub async fn update(self, db: &Database, id: Uuid) -> Result<ArticlePayload, AppError> {
        let existing = db.articles().by_id(id).await?;

        if self.slug != existing.slug && db.articles().slug_exists_excluding(&self.slug, id).await?
        {
            return Err(AppError::Conflict(format!(
                "slug '{}' is already taken",
                self.slug
            )));
        }

        let published_at =
            if self.status == ArticleStatus::Published && existing.published_at.is_none() {
                Some(Utc::now())
            } else {
                existing.published_at
            };

        let article = Article {
            id: existing.id,
            created_at: existing.created_at,
            updated_at: Utc::now(),
            published_at,
            slug: self.slug,
            status: self.status,
            title: self.title,
            content: self.content,
            subject_period_start: self.subject_period_start,
            subject_period_end: self.subject_period_end,
        };
        Ok(db.articles().update(article).await?.into())
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticleListPayload {
    pub id: Uuid,
    pub slug: String,
    pub status: ArticleStatus,
    pub title: Option<String>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub subject_period_start: Option<NaiveDate>,
    pub subject_period_end: Option<NaiveDate>,
}

impl From<Article> for ArticleListPayload {
    fn from(a: Article) -> Self {
        Self {
            id: a.id,
            slug: a.slug,
            status: a.status,
            title: a.title,
            updated_at: a.updated_at,
            published_at: a.published_at,
            subject_period_start: a.subject_period_start,
            subject_period_end: a.subject_period_end,
        }
    }
}

impl ArticleListPayload {
    pub async fn all_cms(db: &Database) -> Result<Vec<Self>, AppError> {
        Ok(db
            .articles()
            .all()
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn list_published(
        db: &Database,
        id_cursor: Option<String>,
        limit: u32,
        search: ArticleSearch,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let cursor: Option<CursorData> = id_cursor.and_then(|b64| {
            let bytes = BASE64_URL_SAFE.decode(b64).ok()?;
            serde_json::from_slice(&bytes).ok()
        });

        let (articles, next_cursor) = db
            .articles()
            .search_published(
                limit,
                cursor,
                search,
            )
            .await?;

        let data = articles.into_iter().map(Self::from).collect();
        let next_cursor = next_cursor.and_then(|cursor| {
            let data = serde_json::to_vec(&cursor).ok()?;
            Some(BASE64_URL_SAFE.encode(data))
        });

        Ok(PaginatedResponse { data, next_cursor })
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ArticlePostPayload {
    pub title: Option<String>,
}

impl ArticlePostPayload {
    pub async fn create(self, db: &Database) -> Result<ArticlePayload, AppError> {
        let slug = match &self.title {
            Some(t) if !t.is_empty() => slugify(t),
            _ => "article".to_string(),
        };

        if db.articles().slug_exists(&slug).await? {
            return Err(AppError::Conflict(format!(
                "slug '{slug}' is already taken"
            )));
        }

        let now = Utc::now();
        let create = ArticleCreate {
            slug,
            status: ArticleStatus::Draft,
            title: self.title,
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
        Ok(db
            .articles()
            .set_relations(article_id, self.into())
            .await?
            .into())
    }
}
