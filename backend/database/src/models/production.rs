use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "ProductionCreate")]
#[ormlite(table = "productions")]
pub struct Production {
    pub id: Uuid,

    pub source_id: Option<i32>,
    pub slug: String,

    pub supertitle_nl: Option<String>,
    pub supertitle_en: Option<String>,
    pub title_nl: Option<String>,
    pub title_en: Option<String>,
    pub artist_nl: Option<String>,
    pub artist_en: Option<String>,
    pub meta_title_nl: Option<String>,
    pub meta_title_en: Option<String>,
    pub meta_description_nl: Option<String>,
    pub meta_description_en: Option<String>,
    pub tagline_nl: Option<String>,
    pub tagline_en: Option<String>,
    pub teaser_nl: Option<String>,
    pub teaser_en: Option<String>,
    pub description_nl: Option<String>,
    pub description_en: Option<String>,
    pub description_extra_nl: Option<String>,
    pub description_extra_en: Option<String>,
    pub description_2_nl: Option<String>,
    pub description_2_en: Option<String>,
    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub quote_nl: Option<String>,
    pub quote_en: Option<String>,
    pub quote_source_nl: Option<String>,
    pub quote_source_en: Option<String>,
    pub programme_nl: Option<String>,
    pub programme_en: Option<String>,
    pub info_nl: Option<String>,
    pub info_en: Option<String>,
    pub description_short_nl: Option<String>,
    pub description_short_en: Option<String>,
    pub eticket_info: Option<String>,

    // pub genres: Vec<String>,
    // pub uitdatabank_keywords: Option<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}
