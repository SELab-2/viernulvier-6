use chrono::{DateTime, Utc};
use database::{
    Database,
    models::{
        collection::{CollectionCreate, CollectionTranslationData, CollectionWithTranslations},
        collection_item::{
            CollectionContentType, CollectionItemCreate, CollectionItemTranslationData,
            CollectionItemWithTranslations,
        },
    },
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionTranslationPayload {
    pub language_code: String,
    pub title: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionItemTranslationPayload {
    pub language_code: String,
    pub comment: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionPayload {
    /// Unique identifier for the collection (UUIDv7).
    pub id: Uuid,
    /// URL-safe identifier used in the shareable link, e.g. `videodroom-candidates-2026`. Must be unique across all collections.
    pub slug: String,
    /// Per-language title and description.
    pub translations: Vec<CollectionTranslationPayload>,
    /// Ordered list of items in this collection.
    pub items: Vec<CollectionItemPayload>,
    /// ISO 8601 creation timestamp.
    pub created_at: DateTime<Utc>,
    /// ISO 8601 last-updated timestamp.
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionPostPayload {
    /// URL-safe identifier used in the shareable link, e.g. `videodroom-candidates-2026`. Must be unique across all collections.
    pub slug: String,
    /// Per-language title and description.
    pub translations: Vec<CollectionTranslationPayload>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionItemPayload {
    /// Unique identifier for this collection item.
    pub id: Uuid,
    /// UUID of the referenced archive entity (production, event, artist, …).
    pub content_id: Uuid,
    /// Type of the referenced entity.
    pub content_type: CollectionContentType,
    /// Zero-based display order within the collection.
    pub position: i32,
    /// Per-language curator annotation for this item.
    pub translations: Vec<CollectionItemTranslationPayload>,
    /// ISO 8601 timestamp when the item was added to the collection.
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionItemPostPayload {
    /// UUID of the referenced archive entity (production, event, artist, …).
    pub content_id: Uuid,
    /// Type of the referenced entity.
    pub content_type: CollectionContentType,
    /// Zero-based display order within the collection.
    pub position: i32,
    /// Per-language curator annotation for this item.
    pub translations: Vec<CollectionItemTranslationPayload>,
}

impl From<CollectionItemWithTranslations> for CollectionItemPayload {
    fn from(wit: CollectionItemWithTranslations) -> Self {
        Self {
            id: wit.item.id,
            content_id: wit.item.content_id,
            content_type: wit.item.content_type,
            position: wit.item.position,
            translations: wit
                .translations
                .into_iter()
                .map(|t| CollectionItemTranslationPayload {
                    language_code: t.language_code,
                    comment: t.comment,
                })
                .collect(),
            created_at: wit.item.created_at,
        }
    }
}

fn build_payload(
    cwt: CollectionWithTranslations,
    items: Vec<CollectionItemWithTranslations>,
) -> CollectionPayload {
    CollectionPayload {
        id: cwt.collection.id,
        slug: cwt.collection.slug,
        translations: cwt
            .translations
            .into_iter()
            .map(|t| CollectionTranslationPayload {
                language_code: t.language_code,
                title: t.title,
                description: t.description,
            })
            .collect(),
        items: items.into_iter().map(CollectionItemPayload::from).collect(),
        created_at: cwt.collection.created_at,
        updated_at: cwt.collection.updated_at,
    }
}

fn item_translations_to_data(translations: &[CollectionItemTranslationPayload]) -> Vec<CollectionItemTranslationData> {
    translations
        .iter()
        .map(|t| CollectionItemTranslationData {
            language_code: t.language_code.clone(),
            comment: t.comment.clone(),
        })
        .collect()
}

fn collection_translations_to_data(translations: &[CollectionTranslationPayload]) -> Vec<CollectionTranslationData> {
    translations
        .iter()
        .map(|t| CollectionTranslationData {
            language_code: t.language_code.clone(),
            title: t.title.clone(),
            description: t.description.clone(),
        })
        .collect()
}

impl CollectionPayload {
    pub async fn all(db: &Database) -> Result<Vec<Self>, AppError> {
        let collections = db.collections().all().await?;
        let ids: Vec<Uuid> = collections.iter().map(|c| c.collection.id).collect();
        let all_items = db.collections().items_for_collections(&ids).await?;

        let mut items_map: HashMap<Uuid, Vec<CollectionItemWithTranslations>> = HashMap::new();
        for item in all_items {
            items_map.entry(item.item.collection_id).or_default().push(item);
        }

        Ok(collections
            .into_iter()
            .map(|cwt| {
                let items = items_map.remove(&cwt.collection.id).unwrap_or_default();
                build_payload(cwt, items)
            })
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        let cwt = db.collections().by_id(id).await?.ok_or(AppError::NotFound)?;
        let items = db.collections().items_for(id).await?;
        Ok(build_payload(cwt, items))
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        let translations = collection_translations_to_data(&self.translations);
        let cwt = db
            .collections()
            .update(self.id, CollectionCreate { slug: self.slug }, translations)
            .await?
            .ok_or(AppError::NotFound)?;
        let items = db.collections().items_for(cwt.collection.id).await?;
        Ok(build_payload(cwt, items))
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        db.collections().delete(id).await?.ok_or(AppError::NotFound)
    }
}

impl CollectionPostPayload {
    pub async fn create(self, db: &Database) -> Result<CollectionPayload, AppError> {
        let translations = collection_translations_to_data(&self.translations);
        let cwt = db
            .collections()
            .insert(CollectionCreate { slug: self.slug }, translations)
            .await?;
        Ok(build_payload(cwt, vec![]))
    }
}

impl CollectionItemPostPayload {
    pub async fn add_to(self, db: &Database, collection_id: Uuid) -> Result<CollectionItemPayload, AppError> {
        let translations = item_translations_to_data(&self.translations);
        Ok(db
            .collections()
            .add_item(CollectionItemCreate {
                collection_id,
                content_id: self.content_id,
                content_type: self.content_type,
                position: self.position,
                translations,
            })
            .await?
            .into())
    }
}
