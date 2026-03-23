use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::models::entity_type::EntityType;

#[derive(Debug, FromRow, PartialEq)]
pub struct EntityMedia {
    pub id: Uuid,
    pub entity_type: EntityType,
    pub entity_id: Uuid,
    pub media_id: Uuid,
    pub role: String,
    pub sort_order: i32,
    pub is_cover_image: bool,
    pub created_at: DateTime<Utc>,
}
