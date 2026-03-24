use chrono::{DateTime, Utc};
use database::models::production::ProductionCreate;
use serde::Deserialize;

use crate::{
    helper::{flatten_loc, flatten_single},
    models::localized_text::ApiLocalizedText,
};

#[derive(Deserialize, Debug)]
pub struct ApiProduction {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub vendor_id: String,
    pub box_office_id: Option<u64>,
    pub performer_field: Option<String>,
    pub performer_type: Option<String>,
    pub attendance_mode: String,

    // info
    pub supertitle: Option<ApiLocalizedText>,
    pub title: Option<ApiLocalizedText>,
    pub artist: Option<ApiLocalizedText>,
    pub meta_title: Option<ApiLocalizedText>,
    pub meta_description: Option<ApiLocalizedText>,
    pub tagline: Option<ApiLocalizedText>,
    pub teaser: Option<ApiLocalizedText>,
    pub description: Option<ApiLocalizedText>,
    pub description_extra: Option<ApiLocalizedText>,
    pub description_2: Option<ApiLocalizedText>,
    pub video_1: Option<ApiLocalizedText>,
    pub video_2: Option<ApiLocalizedText>,
    pub quote: Option<ApiLocalizedText>,
    pub quote_source: Option<ApiLocalizedText>,
    pub programme: Option<ApiLocalizedText>,
    pub info: Option<ApiLocalizedText>,
    pub description_short: Option<ApiLocalizedText>,
    pub eticket_info: Option<ApiLocalizedText>,
    // pub custom_data: LocalizedText, // not currently in the api at all

    // links to others
    pub genres: Vec<String>,
    pub events: Vec<String>,
    pub media_gallery: Option<String>,
    pub review_gallery: Option<String>,
    pub poster_gallery: Option<String>,

    pub uitdatabank_keywords: Vec<String>,
    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,
}

use slug::slugify;

impl From<ApiProduction> for ProductionCreate {
    fn from(api: ApiProduction) -> Self {
        let source_id = api
            .id
            .split('/')
            .next_back()
            .and_then(|s| s.parse::<i32>().ok());

        let (title_nl, title_en) = flatten_loc(api.title);

        let slug_base = title_nl
            .as_deref()
            .or(title_en.as_deref())
            .unwrap_or("untitled-production");

        let slug = match source_id {
            Some(id) => format!("{}-{}", slugify(slug_base), id),
            None => slugify(slug_base),
        };

        let (supertitle_nl, supertitle_en) = flatten_loc(api.supertitle);
        let (artist_nl, artist_en) = flatten_loc(api.artist);
        let (meta_title_nl, meta_title_en) = flatten_loc(api.meta_title);
        let (meta_description_nl, meta_description_en) = flatten_loc(api.meta_description);
        let (tagline_nl, tagline_en) = flatten_loc(api.tagline);
        let (teaser_nl, teaser_en) = flatten_loc(api.teaser);
        let (description_nl, description_en) = flatten_loc(api.description);
        let (description_extra_nl, description_extra_en) = flatten_loc(api.description_extra);
        let (description_2_nl, description_2_en) = flatten_loc(api.description_2);

        let (quote_nl, quote_en) = flatten_loc(api.quote);
        let (quote_source_nl, quote_source_en) = flatten_loc(api.quote_source);
        let (programme_nl, programme_en) = flatten_loc(api.programme);
        let (info_nl, info_en) = flatten_loc(api.info);
        let (description_short_nl, description_short_en) = flatten_loc(api.description_short);

        let video_1 = flatten_single(api.video_1);
        let video_2 = flatten_single(api.video_2).and_then(|s| match s.as_str() {
            "0" => None, // remove links with "0" value
            _ => Some(s),
        });
        let eticket_info = flatten_single(api.eticket_info);

        Self {
            source_id,
            slug,
            supertitle_nl,
            supertitle_en,
            title_nl,
            title_en,
            artist_nl,
            artist_en,
            meta_title_nl,
            meta_title_en,
            meta_description_nl,
            meta_description_en,
            tagline_nl,
            tagline_en,
            teaser_nl,
            teaser_en,
            description_nl,
            description_en,
            description_extra_nl,
            description_extra_en,
            description_2_nl,
            description_2_en,
            video_1,
            video_2,
            quote_nl,
            quote_en,
            quote_source_nl,
            quote_source_en,
            programme_nl,
            programme_en,
            info_nl,
            info_en,
            description_short_nl,
            description_short_en,
            eticket_info,
            uitdatabank_theme: api.uitdatabank_theme,
            uitdatabank_type: api.uitdatabank_type,
        }
    }
}
