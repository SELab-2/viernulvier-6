use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct CollectionItem {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub collection_id: Uuid,
    pub content_id: Uuid,
    pub content_type: CollectionContentType,
    pub position: i32,
    pub comment_nl: Option<String>,
    pub comment_en: Option<String>,
}

pub struct CollectionItemCreate {
    pub collection_id: Uuid,
    pub content_id: Uuid,
    pub content_type: CollectionContentType,
    pub position: i32,
    pub comment_nl: Option<String>,
    pub comment_en: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "collection_content_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum CollectionContentType {
    Production,
    Event,
    Blogpost,
    Artist,
    Location,
}
