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

        macro_rules! extract_translations {
            // kind of like a regex
            // $field:ident matches identifiers (variables) and puts them in $field
            // + is at least once
            // $(,)? allows a trailing comma
            ( $( $field:ident ),+ $(,)? ) => {{
                // write this line for every field
                $( let $field = flatten_loc(api.$field); )+

                let mut out = Vec::with_capacity(2);

                // nl
                // expands into supertitle.0.is_some() || title.0.is_some() ...
                if $( $field.0.is_some() )||+ {
                    out.push(ProductionTranslationData {
                        language_code: "nl".into(),
                        $( $field: $field.0 ),+
                    });
                }

                // en
                if $( $field.1.is_some() )||+ {
                    out.push(ProductionTranslationData {
                        language_code: "en".into(),
                        $( $field: $field.1 ),+
                    });
                }

                out
            }};
        }

        let translations = extract_translations!(
            supertitle,
            title,
            artist,
            meta_title,
            meta_description,
            tagline,
            teaser,
            description,
            description_extra,
            description_2,
            quote,
            quote_source,
            programme,
            info,
            description_short
        );

        Self {
            production,
            translations,
        }
    }
}
