use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize, ToSchema)]
#[sqlx(type_name = "entity_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Production,
    Artist,
    Article,
    Media,
    Event,
}
