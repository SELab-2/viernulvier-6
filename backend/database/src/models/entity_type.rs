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
    Location,
    Event,
    Series,
}

impl EntityType {
    /// Returns the join table name for articles about this entity type, if applicable.
    pub fn article_join_table(&self) -> Option<&'static str> {
        match self {
            Self::Production => Some("articles_about_productions"),
            Self::Artist => Some("articles_about_artists"),
            Self::Location => Some("articles_about_locations"),
            Self::Event => Some("articles_about_events"),
            Self::Series => Some("articles_about_series"),
            _ => None,
        }
    }

    /// Returns the foreign-key column in the article join table, if applicable.
    pub fn article_id_column(&self) -> Option<&'static str> {
        match self {
            Self::Production => Some("production_id"),
            Self::Artist => Some("artist_id"),
            Self::Location => Some("location_id"),
            Self::Event => Some("event_id"),
            Self::Series => Some("series_id"),
            _ => None,
        }
    }
}
