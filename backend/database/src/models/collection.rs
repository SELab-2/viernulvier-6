use chrono::{DateTime, Utc};
use ormlite::Model;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "collection_visibility", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum CollectionVisibility {
    Public,
    Unlisted,
}

impl Default for CollectionVisibility {
    fn default() -> Self {
        Self::Public
    }
}

#[derive(Debug, Model, PartialEq)]
#[ormlite(table = "collections")]
pub struct Collection {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub slug: String,
    pub visibility: CollectionVisibility,
}

pub struct CollectionCreate {
    pub slug: String,
    pub visibility: CollectionVisibility,
}

pub struct CollectionSearch {
    pub q: Option<String>,
    pub visibility: Option<CollectionVisibility>,
}

#[derive(Debug, FromRow, PartialEq, Clone)]
pub struct CollectionTranslation {
    pub collection_id: Uuid,
    pub language_code: String,
    pub title: String,
    pub description: String,
}

pub struct CollectionTranslationData {
    pub language_code: String,
    pub title: String,
    pub description: String,
}

#[derive(Debug, FromRow, PartialEq)]
pub struct CollectionWithScore {
    #[sqlx(flatten)]
    pub collection: Collection,
    pub distance_score: f32,
}

pub struct CollectionWithTranslations {
    pub collection: Collection,
    pub translations: Vec<CollectionTranslation>,
}
