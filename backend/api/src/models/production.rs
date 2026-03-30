use chrono::{DateTime, Utc};
use database::models::production::{ProductionCreate, ProductionTranslationData};
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

/// Holds the production base data and its translations after conversion from the API.
pub struct ProductionImportData {
    pub production: ProductionCreate,
    pub translations: Vec<ProductionTranslationData>,
}

use slug::slugify;

impl From<ApiProduction> for ProductionImportData {
    fn from(api: ApiProduction) -> Self {
        let source_id = api
            .id
            .split('/')
            .next_back()
            .and_then(|s| s.parse::<i32>().ok());

        let slug_base_nl = api.title.as_ref().and_then(|t| t.nl.clone());
        let slug_base_en = api.title.as_ref().and_then(|t| t.en.clone());
        let slug_base = slug_base_nl
            .as_deref()
            .or(slug_base_en.as_deref())
            .unwrap_or("untitled-production");

        let slug = match source_id {
            Some(id) => format!("{}-{}", slugify(slug_base), id),
            None => slugify(slug_base),
        };

        let video_1 = flatten_single(api.video_1);
        let video_2 = flatten_single(api.video_2).and_then(|s| match s.as_str() {
            "0" => None, // remove links with "0" value
            _ => Some(s),
        });
        let eticket_info = flatten_single(api.eticket_info);

        let production = ProductionCreate {
            source_id,
            slug,
            video_1,
            video_2,
            eticket_info,
            uitdatabank_theme: api.uitdatabank_theme,
            uitdatabank_type: api.uitdatabank_type,
        };

        let translations =
            build_translations(api.supertitle, api.title, api.artist, api.meta_title, api.meta_description, api.tagline, api.teaser, api.description, api.description_extra, api.description_2, api.quote, api.quote_source, api.programme, api.info, api.description_short);

        Self {
            production,
            translations,
        }
    }
}

fn build_translations(
    supertitle: Option<ApiLocalizedText>,
    title: Option<ApiLocalizedText>,
    artist: Option<ApiLocalizedText>,
    meta_title: Option<ApiLocalizedText>,
    meta_description: Option<ApiLocalizedText>,
    tagline: Option<ApiLocalizedText>,
    teaser: Option<ApiLocalizedText>,
    description: Option<ApiLocalizedText>,
    description_extra: Option<ApiLocalizedText>,
    description_2: Option<ApiLocalizedText>,
    quote: Option<ApiLocalizedText>,
    quote_source: Option<ApiLocalizedText>,
    programme: Option<ApiLocalizedText>,
    info: Option<ApiLocalizedText>,
    description_short: Option<ApiLocalizedText>,
) -> Vec<ProductionTranslationData> {
    let (supertitle_nl, supertitle_en) = flatten_loc(supertitle);
    let (title_nl, title_en) = flatten_loc(title);
    let (artist_nl, artist_en) = flatten_loc(artist);
    let (meta_title_nl, meta_title_en) = flatten_loc(meta_title);
    let (meta_description_nl, meta_description_en) = flatten_loc(meta_description);
    let (tagline_nl, tagline_en) = flatten_loc(tagline);
    let (teaser_nl, teaser_en) = flatten_loc(teaser);
    let (description_nl, description_en) = flatten_loc(description);
    let (description_extra_nl, description_extra_en) = flatten_loc(description_extra);
    let (description_2_nl, description_2_en) = flatten_loc(description_2);
    let (quote_nl, quote_en) = flatten_loc(quote);
    let (quote_source_nl, quote_source_en) = flatten_loc(quote_source);
    let (programme_nl, programme_en) = flatten_loc(programme);
    let (info_nl, info_en) = flatten_loc(info);
    let (description_short_nl, description_short_en) = flatten_loc(description_short);

    let mut out = Vec::with_capacity(2);

    let nl_any = [
        &supertitle_nl, &title_nl, &artist_nl, &meta_title_nl, &meta_description_nl,
        &tagline_nl, &teaser_nl, &description_nl, &description_extra_nl, &description_2_nl,
        &quote_nl, &quote_source_nl, &programme_nl, &info_nl, &description_short_nl,
    ]
    .iter()
    .any(|f| f.is_some());

    if nl_any {
        out.push(ProductionTranslationData {
            language_code: "nl".into(),
            supertitle: supertitle_nl,
            title: title_nl,
            artist: artist_nl,
            meta_title: meta_title_nl,
            meta_description: meta_description_nl,
            tagline: tagline_nl,
            teaser: teaser_nl,
            description: description_nl,
            description_extra: description_extra_nl,
            description_2: description_2_nl,
            quote: quote_nl,
            quote_source: quote_source_nl,
            programme: programme_nl,
            info: info_nl,
            description_short: description_short_nl,
        });
    }

    let en_any = [
        &supertitle_en, &title_en, &artist_en, &meta_title_en, &meta_description_en,
        &tagline_en, &teaser_en, &description_en, &description_extra_en, &description_2_en,
        &quote_en, &quote_source_en, &programme_en, &info_en, &description_short_en,
    ]
    .iter()
    .any(|f| f.is_some());

    if en_any {
        out.push(ProductionTranslationData {
            language_code: "en".into(),
            supertitle: supertitle_en,
            title: title_en,
            artist: artist_en,
            meta_title: meta_title_en,
            meta_description: meta_description_en,
            tagline: tagline_en,
            teaser: teaser_en,
            description: description_en,
            description_extra: description_extra_en,
            description_2: description_2_en,
            quote: quote_en,
            quote_source: quote_source_en,
            programme: programme_en,
            info: info_en,
            description_short: description_short_en,
        });
    }

    out
}
