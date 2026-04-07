use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct Series {
    pub id: Uuid,
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct SeriesCreate {
    pub slug: String,
}

#[derive(Debug, FromRow, PartialEq, Clone)]
pub struct SeriesTranslation {
    pub series_id: Uuid,
    pub language_code: String,
    pub name: String,
    pub subtitle: String,
    pub description: String,
}

pub struct SeriesTranslationData {
    pub language_code: String,
    pub name: String,
    pub subtitle: String,
    pub description: String,
}

pub struct SeriesWithTranslations {
    pub series: Series,
    pub translations: Vec<SeriesTranslation>,
}

#[derive(Debug, FromRow)]
pub struct SeriesDerivedPeriod {
    pub series_id: Uuid,
    pub period_start: Option<DateTime<Utc>>,
    pub period_end: Option<DateTime<Utc>>,
}
