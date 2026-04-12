use ormlite::Model;
use sqlx::FromRow;
use uuid::Uuid;

use crate::models::sort::Sort;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "ProductionCreate")]
#[ormlite(table = "productions")]
pub struct Production {
    pub id: Uuid,

    pub source_id: Option<i32>,
    pub slug: String,

    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub eticket_info: Option<String>,

    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}

#[derive(Debug, PartialEq, FromRow)]
pub struct ProductionWithScore {
    #[sqlx(flatten)]
    pub production: Production,
    pub distance_score: f32,
}

/// A single row from `production_translations`.
#[derive(Debug, sqlx::FromRow, PartialEq, Clone)]
pub struct ProductionTranslation {
    pub production_id: Uuid,
    pub language_code: String,
    pub supertitle: Option<String>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub tagline: Option<String>,
    pub teaser: Option<String>,
    pub description: Option<String>,
    pub description_extra: Option<String>,
    pub description_2: Option<String>,
    pub quote: Option<String>,
    pub quote_source: Option<String>,
    pub programme: Option<String>,
    pub info: Option<String>,
    pub description_short: Option<String>,
}

/// Per-language content to insert or upsert — no production_id (supplied by the repo).
pub struct ProductionTranslationData {
    pub language_code: String,
    pub supertitle: Option<String>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub tagline: Option<String>,
    pub teaser: Option<String>,
    pub description: Option<String>,
    pub description_extra: Option<String>,
    pub description_2: Option<String>,
    pub quote: Option<String>,
    pub quote_source: Option<String>,
    pub programme: Option<String>,
    pub info: Option<String>,
    pub description_short: Option<String>,
}

/// Production with all its translations — the standard return type for repo reads.
pub struct ProductionWithTranslations {
    pub production: Production,
    pub translations: Vec<ProductionTranslation>,
}

pub struct ProductionSearch {
    pub q: Option<String>,
    pub discipline: Option<String>,
    pub format: Option<String>,
    pub theme: Option<String>,
    pub audience: Option<String>,
    pub artist: Option<String>,
    pub location: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort: Option<Sort>,
    pub after: Option<String>,
}
