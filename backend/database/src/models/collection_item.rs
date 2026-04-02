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
}

pub struct CollectionItemCreate {
    pub collection_id: Uuid,
    pub content_id: Uuid,
    pub content_type: CollectionContentType,
    pub position: i32,
    pub translations: Vec<CollectionItemTranslationData>,
}

#[derive(Debug, FromRow, PartialEq, Clone)]
pub struct CollectionItemTranslation {
    pub collection_item_id: Uuid,
    pub language_code: String,
    pub comment: Option<String>,
}

pub struct CollectionItemTranslationData {
    pub language_code: String,
    pub comment: Option<String>,
}

pub struct CollectionItemWithTranslations {
    pub item: CollectionItem,
    pub translations: Vec<CollectionItemTranslation>,
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
    Media,
}
