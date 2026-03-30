use chrono::{DateTime, Utc};
use database::{
    Database,
    models::{
        collection::{Collection, CollectionCreate},
        collection_item::{CollectionContentType, CollectionItem, CollectionItemCreate},
    },
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CollectionPayload {
    /// Unique identifier for the collection (UUIDv7).
    pub id: Uuid,
    /// URL-safe identifier used in the shareable link, e.g. `videodroom-candidates-2026`. Must be unique across all collections.
    pub slug: String,
    /// Title of the collection in Dutch.
    pub title_nl: String,
    /// Title of the collection in English.
    pub title_en: String,
    /// Optional curator's note about this collection in Dutch.
    pub description_nl: String,
    /// Optional curator's note about this collection in English.
    pub description_en: String,
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
    /// Title of the collection in Dutch.
    pub title_nl: String,
    /// Title of the collection in English.
    pub title_en: String,
    /// Optional curator's note about this collection in Dutch.
    pub description_nl: String,
    /// Optional curator's note about this collection in English.
    pub description_en: String,
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
    /// Optional curator's annotation for this specific item in Dutch, shown on the collection page.
    pub comment_nl: Option<String>,
    /// Optional curator's annotation for this specific item in English, shown on the collection page.
    pub comment_en: Option<String>,
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
    /// Optional curator's annotation for this specific item in Dutch, shown on the collection page.
    pub comment_nl: Option<String>,
    /// Optional curator's annotation for this specific item in English, shown on the collection page.
    pub comment_en: Option<String>,
}

impl From<CollectionItem> for CollectionItemPayload {
    fn from(item: CollectionItem) -> Self {
        Self {
            id: item.id,
            content_id: item.content_id,
            content_type: item.content_type,
            position: item.position,
            comment_nl: item.comment_nl,
            comment_en: item.comment_en,
            created_at: item.created_at,
        }
    }
}

fn build_payload(collection: Collection, items: Vec<CollectionItem>) -> CollectionPayload {
    CollectionPayload {
        id: collection.id,
        slug: collection.slug,
        title_nl: collection.title_nl,
        title_en: collection.title_en,
        description_nl: collection.description_nl,
        description_en: collection.description_en,
        items: items.into_iter().map(CollectionItemPayload::from).collect(),
        created_at: collection.created_at,
        updated_at: collection.updated_at,
    }
}

impl CollectionPayload {
    pub async fn all(db: &Database) -> Result<Vec<Self>, AppError> {
        let collections = db.collections().all().await?;
        let ids: Vec<Uuid> = collections.iter().map(|c| c.id).collect();
        let all_items = db.collections().items_for_collections(&ids).await?;

        let mut items_map: HashMap<Uuid, Vec<CollectionItem>> = HashMap::new();
        for item in all_items {
            items_map.entry(item.collection_id).or_default().push(item);
        }

        Ok(collections
            .into_iter()
            .map(|c| {
                let items = items_map.remove(&c.id).unwrap_or_default();
                build_payload(c, items)
            })
            .collect())
    }

    pub async fn by_id(db: &Database, id: Uuid) -> Result<Self, AppError> {
        let collection = db.collections().by_id(id).await?.ok_or(AppError::NotFound)?;
        let items = db.collections().items_for(id).await?;
        Ok(build_payload(collection, items))
    }

    pub async fn update(self, db: &Database) -> Result<Self, AppError> {
        let updated = db
            .collections()
            .update(
                self.id,
                CollectionCreate {
                    slug: self.slug,
                    title_nl: self.title_nl,
                    title_en: self.title_en,
                    description_nl: self.description_nl,
                    description_en: self.description_en,
                },
            )
            .await?
            .ok_or(AppError::NotFound)?;
        let items = db.collections().items_for(updated.id).await?;
        Ok(build_payload(updated, items))
    }

    pub async fn delete(db: &Database, id: Uuid) -> Result<(), AppError> {
        db.collections().delete(id).await?.ok_or(AppError::NotFound)
    }
}

impl CollectionPostPayload {
    pub async fn create(self, db: &Database) -> Result<CollectionPayload, AppError> {
        let collection = db
            .collections()
            .insert(CollectionCreate {
                slug: self.slug,
                title_nl: self.title_nl,
                title_en: self.title_en,
                description_nl: self.description_nl,
                description_en: self.description_en,
            })
            .await?;
        Ok(build_payload(collection, vec![]))
    }
}

impl CollectionItemPostPayload {
    pub async fn add_to(self, db: &Database, collection_id: Uuid) -> Result<CollectionItemPayload, AppError> {
        Ok(db
            .collections()
            .add_item(CollectionItemCreate {
                collection_id,
                content_id: self.content_id,
                content_type: self.content_type,
                position: self.position,
                comment_nl: self.comment_nl,
                comment_en: self.comment_en,
            })
            .await?
            .into())
    }
}
