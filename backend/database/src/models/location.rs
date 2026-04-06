use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "LocationCreate")]
#[ormlite(table = "locations")]
pub struct Location {
    pub id: Uuid,

    pub source_id: Option<i32>,

    pub name: Option<String>, // not currently present in their API, but sometimes present in the CSV
    pub code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub postal_code: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone_1: Option<String>,
    pub phone_2: Option<String>,
    pub is_owned_by_viernulvier: Option<bool>,
    pub uitdatabank_id: Option<String>,
    pub slug: Option<String>,
}

/// A single row from `location_translations`.
#[derive(Debug, sqlx::FromRow, PartialEq, Clone)]
pub struct LocationTranslation {
    pub location_id: Uuid,
    pub language_code: String,
    pub description: Option<String>,
    pub history: Option<String>,
}

/// Per-language content to insert or upsert — no location_id (supplied by the repo).
pub struct LocationTranslationData {
    pub language_code: String,
    pub description: Option<String>,
    pub history: Option<String>,
}

/// Location with all its translations — the standard return type for repo reads.
pub struct LocationWithTranslations {
    pub location: Location,
    pub translations: Vec<LocationTranslation>,
}

pub struct LocationSearch {
    pub q: Option<String>,
}
