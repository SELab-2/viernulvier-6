use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Collection {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub slug: String,
    pub title_nl: String,
    pub title_en: String,
    pub description_nl: String,
    pub description_en: String,
}

pub struct CollectionCreate {
    pub slug: String,
    pub title_nl: String,
    pub title_en: String,
    pub description_nl: String,
    pub description_en: String,
}
