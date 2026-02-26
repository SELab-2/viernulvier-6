use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct CollectionItem {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub collection_id: Uuid,
    pub content_id: Uuid,
    pub content_type: CollectionContentType,
    pub position: u8,
}

#[derive(Debug, PartialEq, sqlx::Type)]
#[sqlx(type_name = "collection_content_type", rename_all = "snake_case")]
pub enum CollectionContentType {
    Production,
    Event,
    Blogpost,
}
