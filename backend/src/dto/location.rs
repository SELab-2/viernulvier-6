use database::{
    Database,
    models::location::{
        Location, LocationCreate, LocationTranslationData, LocationWithTranslations,
    },
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use base64::{Engine, prelude::BASE64_URL_SAFE};

use crate::{
    dto::paginated::PaginatedResponse, error::AppError,
    handlers::queries::location::LocationSearchQuery,
};

impl LocationPayload {
    pub async fn all(
        db: &Database,
        id_cursor: Option<String>,
        limit: u32,
        _search: LocationSearchQuery,
    ) -> Result<PaginatedResponse<Self>, AppError> {
        let id_cursor: Option<Uuid> = id_cursor.and_then(|b64| {
            let bytes: [u8; 16] = BASE64_URL_SAFE.decode(b64).ok()?.try_into().ok()?;
            Some(Uuid::from_bytes(bytes))
        });
        let limit = limit as usize;
        let mut data: Vec<_> = db
            .locations()
            .all(limit + 1, id_cursor)
            .await?
            .into_iter()
            .map(Self::from)
            .collect();

        // only return a cursor if there are more items
        let next_cursor = if data.len() == limit + 1 {
            data.pop();
            data.last().map(|l| BASE64_URL_SAFE.encode(l.id))
        } else {
            None
        };

        Ok(PaginatedResponse { data, next_cursor })
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        Ok(Self::from(db.locations().by_id(id).await?))
    }

    pub async fn by_slug(db: &Database, slug: &str) -> Result<Self, AppError> {
        Ok(Self::from(db.locations().by_slug(slug).await?))
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        let translations = translations_to_data(&self.translations);
        let location: Location = self.into();
        Ok(db
            .locations()
            .update(location, translations)
            .await?
            .into())
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        Ok(db.locations().delete(id).await?)
    }
}

impl LocationPostPayload {
    pub async fn create(self, db: &Database) -> Result<LocationPayload, AppError> {
        let translations = translations_to_data(&self.translations);
        let location_create: LocationCreate = self.into();
        Ok(db
            .locations()
            .insert(location_create, translations)
            .await?
            .into())
    }
}

fn translations_to_data(
    translations: &[LocationTranslationPayload],
) -> Vec<LocationTranslationData> {
    translations
        .iter()
        .map(|t| LocationTranslationData {
            language_code: t.language_code.clone(),
            description: t.description.clone(),
            history: t.history.clone(),
        })
        .collect()
}

/// The per-language content for a location.
#[derive(Serialize, Deserialize, ToSchema, Clone)]
pub struct LocationTranslationPayload {
    pub language_code: String,
    pub description: Option<String>,
    pub history: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct LocationPayload {
    pub id: Uuid,

    pub source_id: Option<i32>,

    pub name: Option<String>,
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

    #[serde(default)]
    pub translations: Vec<LocationTranslationPayload>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct LocationPostPayload {
    pub source_id: Option<i32>,

    pub name: Option<String>,
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

    #[serde(default)]
    pub translations: Vec<LocationTranslationPayload>,
}

impl From<LocationWithTranslations> for LocationPayload {
    fn from(lwt: LocationWithTranslations) -> Self {
        let translations = lwt
            .translations
            .into_iter()
            .map(|t| LocationTranslationPayload {
                language_code: t.language_code,
                description: t.description,
                history: t.history,
            })
            .collect();

        Self {
            id: lwt.location.id,
            source_id: lwt.location.source_id,
            name: lwt.location.name,
            code: lwt.location.code,
            street: lwt.location.street,
            number: lwt.location.number,
            postal_code: lwt.location.postal_code,
            city: lwt.location.city,
            country: lwt.location.country,
            phone_1: lwt.location.phone_1,
            phone_2: lwt.location.phone_2,
            is_owned_by_viernulvier: lwt.location.is_owned_by_viernulvier,
            uitdatabank_id: lwt.location.uitdatabank_id,
            slug: lwt.location.slug,
            translations,
        }
    }
}

impl From<LocationPayload> for Location {
    fn from(p: LocationPayload) -> Self {
        Self {
            id: p.id,
            source_id: p.source_id,
            name: p.name,
            code: p.code,
            street: p.street,
            number: p.number,
            postal_code: p.postal_code,
            city: p.city,
            country: p.country,
            phone_1: p.phone_1,
            phone_2: p.phone_2,
            is_owned_by_viernulvier: p.is_owned_by_viernulvier,
            uitdatabank_id: p.uitdatabank_id,
            slug: p.slug,
        }
    }
}

impl From<LocationPostPayload> for LocationCreate {
    fn from(p: LocationPostPayload) -> Self {
        Self {
            source_id: p.source_id,
            name: p.name,
            code: p.code,
            street: p.street,
            number: p.number,
            postal_code: p.postal_code,
            city: p.city,
            country: p.country,
            phone_1: p.phone_1,
            phone_2: p.phone_2,
            is_owned_by_viernulvier: p.is_owned_by_viernulvier,
            uitdatabank_id: p.uitdatabank_id,
            slug: p.slug,
        }
    }
}
