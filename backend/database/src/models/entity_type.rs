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
    pub fn table(&self) -> &'static str {
        match self {
            Self::Production => "productions",
            Self::Artist => "artists",
            Self::Article => "articles",
            Self::Media => "media",
            Self::Location => "locations",
            Self::Event => "events",
            Self::Series => "series",
        }
    }

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
