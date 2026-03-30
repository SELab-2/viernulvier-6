use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Collection {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub slug: String,
}

pub struct CollectionCreate {
    pub slug: String,
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

pub struct CollectionWithTranslations {
    pub collection: Collection,
    pub translations: Vec<CollectionTranslation>,
}
