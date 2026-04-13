use chrono::{DateTime, NaiveDate, Utc};
use ormlite::Model;
use sqlx::FromRow;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug)]
pub struct ArticleRelations {
    pub production_ids: Vec<Uuid>,
    pub artist_ids: Vec<Uuid>,
    pub location_ids: Vec<Uuid>,
    pub event_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, PartialEq, sqlx::Type, Serialize, Deserialize, ToSchema)]
#[sqlx(type_name = "article_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ArticleStatus {
    Draft,
    Published,
    Archived,
}

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "ArticleCreate")]
#[ormlite(table = "articles")]
pub struct Article {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub slug: String,
    pub status: ArticleStatus,
    pub title: Option<String>,
    pub content: Option<Value>,
    pub subject_period_start: Option<NaiveDate>,
    pub subject_period_end: Option<NaiveDate>,
}

#[derive(Debug, PartialEq, FromRow)]
pub struct ArticleWithScore {
    #[sqlx(flatten)]
    pub article: Article,
    pub distance_score: f32,
}

pub struct ArticleSearch {
    pub q: Option<String>,
}
