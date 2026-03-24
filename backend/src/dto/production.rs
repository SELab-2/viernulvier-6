use std::collections::HashMap;

use database::{
    Database,
    models::production::{
        Production, ProductionCreate, ProductionTranslationData, ProductionWithTranslations,
    },
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

impl ProductionPayload {
    pub async fn all(db: &Database, limit: usize) -> Result<Vec<Self>, AppError> {
        Ok(db
            .productions()
            .all(limit)
            .await?
            .into_iter()
            .map(Self::from)
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(db.productions().by_id(id).await?.into())
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        let translations = translations_to_data(&self.translations);
        let production: Production = self.into();
        Ok(db.productions().update(production, translations).await?.into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.productions().delete(id).await?)
    }
}

impl ProductionPostPayload {
    pub async fn create(self, db: &Database) -> Result<ProductionPayload, AppError> {
        let translations = translations_to_data(&self.translations);
        let production_create: ProductionCreate = self.into();
        Ok(db.productions().insert(production_create, translations).await?.into())
    }
}

fn translations_to_data(
    map: &HashMap<String, ProductionTranslationPayload>,
) -> Vec<ProductionTranslationData> {
    map.iter()
        .map(|(lang, t)| ProductionTranslationData {
            language_code: lang.clone(),
            supertitle: t.supertitle.clone(),
            title: t.title.clone(),
            artist: t.artist.clone(),
            meta_title: t.meta_title.clone(),
            meta_description: t.meta_description.clone(),
            tagline: t.tagline.clone(),
            teaser: t.teaser.clone(),
            description: t.description.clone(),
            description_extra: t.description_extra.clone(),
            description_2: t.description_2.clone(),
            quote: t.quote.clone(),
            quote_source: t.quote_source.clone(),
            programme: t.programme.clone(),
            info: t.info.clone(),
            description_short: t.description_short.clone(),
        })
        .collect()
}

/// The per-language content for a production.
#[derive(Serialize, Deserialize, ToSchema, Clone)]
pub struct ProductionTranslationPayload {
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

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProductionPayload {
    pub id: Uuid,
    pub source_id: Option<i32>,
    pub slug: String,

    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub eticket_info: Option<String>,

    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,

    /// Translations keyed by language code (e.g. "nl", "en").
    #[schema(additional_properties)]
    pub translations: HashMap<String, ProductionTranslationPayload>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProductionPostPayload {
    pub source_id: Option<i32>,
    pub slug: String,

    pub video_1: Option<String>,
    pub video_2: Option<String>,
    pub eticket_info: Option<String>,

    pub uitdatabank_theme: Option<String>,
    pub uitdatabank_type: Option<String>,

    /// Translations keyed by language code (e.g. "nl", "en").
    #[schema(additional_properties)]
    pub translations: HashMap<String, ProductionTranslationPayload>,
}

impl From<ProductionWithTranslations> for ProductionPayload {
    fn from(pwt: ProductionWithTranslations) -> Self {
        let translations = pwt
            .translations
            .into_iter()
            .map(|t| {
                (
                    t.language_code,
                    ProductionTranslationPayload {
                        supertitle: t.supertitle,
                        title: t.title,
                        artist: t.artist,
                        meta_title: t.meta_title,
                        meta_description: t.meta_description,
                        tagline: t.tagline,
                        teaser: t.teaser,
                        description: t.description,
                        description_extra: t.description_extra,
                        description_2: t.description_2,
                        quote: t.quote,
                        quote_source: t.quote_source,
                        programme: t.programme,
                        info: t.info,
                        description_short: t.description_short,
                    },
                )
            })
            .collect();

        Self {
            id: pwt.production.id,
            source_id: pwt.production.source_id,
            slug: pwt.production.slug,
            video_1: pwt.production.video_1,
            video_2: pwt.production.video_2,
            eticket_info: pwt.production.eticket_info,
            uitdatabank_theme: pwt.production.uitdatabank_theme,
            uitdatabank_type: pwt.production.uitdatabank_type,
            translations,
        }
    }
}

impl From<ProductionPayload> for Production {
    fn from(p: ProductionPayload) -> Self {
        Self {
            id: p.id,
            source_id: p.source_id,
            slug: p.slug,
            video_1: p.video_1,
            video_2: p.video_2,
            eticket_info: p.eticket_info,
            uitdatabank_theme: p.uitdatabank_theme,
            uitdatabank_type: p.uitdatabank_type,
        }
    }
}

impl From<ProductionPostPayload> for ProductionCreate {
    fn from(p: ProductionPostPayload) -> Self {
        Self {
            source_id: p.source_id,
            slug: p.slug,
            video_1: p.video_1,
            video_2: p.video_2,
            eticket_info: p.eticket_info,
            uitdatabank_theme: p.uitdatabank_theme,
            uitdatabank_type: p.uitdatabank_type,
        }
    }
}
