use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        collection::{
            Collection, CollectionCreate, CollectionTranslation, CollectionTranslationData,
            CollectionWithTranslations,
        },
        collection_item::{
            CollectionItem, CollectionItemBulkUpdate, CollectionItemCreate,
            CollectionItemTranslation, CollectionItemTranslationData, CollectionItemWithTranslations,
        },
    },
};

pub struct CollectionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> CollectionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn all(&self) -> Result<Vec<CollectionWithTranslations>, DatabaseError> {
        let collections =
            sqlx::query_as::<_, Collection>("SELECT * FROM collections ORDER BY created_at DESC")
                .fetch_all(self.db)
                .await?;

        if collections.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = collections.iter().map(|c| c.id).collect();
        let all_translations = sqlx::query_as::<_, CollectionTranslation>(
            "SELECT * FROM collection_translations WHERE collection_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<CollectionTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.collection_id).or_default().push(t);
        }

        Ok(collections
            .into_iter()
            .map(|c| {
                let translations = translation_map.remove(&c.id).unwrap_or_default();
                CollectionWithTranslations {
                    collection: c,
                    translations,
                }
            })
            .collect())
    }

    pub async fn by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<CollectionWithTranslations>, DatabaseError> {
        let Some(collection) =
            sqlx::query_as::<_, Collection>("SELECT * FROM collections WHERE id = $1")
                .bind(id)
                .fetch_optional(self.db)
                .await?
        else {
            return Ok(None);
        };

        let translations = self.fetch_translations_for(collection.id).await?;

        Ok(Some(CollectionWithTranslations {
            collection,
            translations,
        }))
    }

    pub async fn insert(
        &self,
        data: CollectionCreate,
        translations: Vec<CollectionTranslationData>,
    ) -> Result<CollectionWithTranslations, DatabaseError> {
        let collection = sqlx::query_as::<_, Collection>(
            "INSERT INTO collections (slug) VALUES ($1) RETURNING *",
        )
        .bind(data.slug)
        .fetch_one(self.db)
        .await?;

        self.upsert_translations(collection.id, &translations)
            .await?;
        let translations = self.fetch_translations_for(collection.id).await?;

        Ok(CollectionWithTranslations {
            collection,
            translations,
        })
    }

    pub async fn update(
        &self,
        id: Uuid,
        data: CollectionCreate,
        translations: Vec<CollectionTranslationData>,
    ) -> Result<Option<CollectionWithTranslations>, DatabaseError> {
        let Some(collection) = sqlx::query_as::<_, Collection>(
            "UPDATE collections SET slug = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        )
        .bind(id)
        .bind(data.slug)
        .fetch_optional(self.db)
        .await?
        else {
            return Ok(None);
        };

        self.upsert_translations(collection.id, &translations)
            .await?;
        let translations = self.fetch_translations_for(collection.id).await?;

        Ok(Some(CollectionWithTranslations {
            collection,
            translations,
        }))
    }

    pub async fn delete(&self, id: Uuid) -> Result<Option<()>, DatabaseError> {
        let res = sqlx::query("DELETE FROM collections WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Ok(None);
        }

        Ok(Some(()))
    }

    pub async fn items_for(
        &self,
        collection_id: Uuid,
    ) -> Result<Vec<CollectionItemWithTranslations>, DatabaseError> {
        let items = sqlx::query_as::<_, CollectionItem>(
            "SELECT * FROM collection_items WHERE collection_id = $1 ORDER BY position ASC",
        )
        .bind(collection_id)
        .fetch_all(self.db)
        .await?;

        self.attach_item_translations(items).await
    }

    pub async fn items_for_collections(
        &self,
        collection_ids: &[Uuid],
    ) -> Result<Vec<CollectionItemWithTranslations>, DatabaseError> {
        let items = sqlx::query_as::<_, CollectionItem>(
            "SELECT * FROM collection_items WHERE collection_id = ANY($1) ORDER BY position ASC",
        )
        .bind(collection_ids)
        .fetch_all(self.db)
        .await?;

        self.attach_item_translations(items).await
    }

    pub async fn add_item(
        &self,
        item: CollectionItemCreate,
    ) -> Result<CollectionItemWithTranslations, DatabaseError> {
        let new_item = sqlx::query_as::<_, CollectionItem>(
            "INSERT INTO collection_items (collection_id, content_id, content_type, position) VALUES ($1, $2, $3, $4) RETURNING *",
        )
        .bind(item.collection_id)
        .bind(item.content_id)
        .bind(item.content_type)
        .bind(item.position)
        .fetch_one(self.db)
        .await?;

        self.upsert_item_translations(new_item.id, &item.translations)
            .await?;
        let translations = self.fetch_item_translations_for(new_item.id).await?;

        Ok(CollectionItemWithTranslations {
            item: new_item,
            translations,
        })
    }

    pub async fn bulk_update_items(
        &self,
        collection_id: Uuid,
        items: &[CollectionItemBulkUpdate],
    ) -> Result<(), DatabaseError> {
        if items.is_empty() {
            return Ok(());
        }

        let ids: Vec<Uuid> = items.iter().map(|i| i.id).collect();
        let positions: Vec<i32> = items.iter().map(|i| i.position).collect();

        sqlx::query(
            "UPDATE collection_items SET position = updates.position
            FROM UNNEST($2::uuid[], $3::int[]) AS updates(id, position)
            WHERE collection_items.id = updates.id AND collection_items.collection_id = $1",
        )
        .bind(collection_id)
        .bind(&ids[..])
        .bind(&positions[..])
        .execute(self.db)
        .await?;

        for item in items {
            self.upsert_item_translations(item.id, &item.translations).await?;
        }

        Ok(())
    }

    pub async fn delete_item(
        &self,
        collection_id: Uuid,
        item_id: Uuid,
    ) -> Result<Option<()>, DatabaseError> {
        let res = sqlx::query("DELETE FROM collection_items WHERE id = $1 AND collection_id = $2")
            .bind(item_id)
            .bind(collection_id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Ok(None);
        }

        Ok(Some(()))
    }

    async fn fetch_translations_for(
        &self,
        collection_id: Uuid,
    ) -> Result<Vec<CollectionTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, CollectionTranslation>(
            "SELECT * FROM collection_translations WHERE collection_id = $1",
        )
        .bind(collection_id)
        .fetch_all(self.db)
        .await?)
    }

    async fn upsert_translations(
        &self,
        collection_id: Uuid,
        translations: &[CollectionTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let titles: Vec<&str> = translations.iter().map(|t| t.title.as_str()).collect();
        let descriptions: Vec<&str> = translations
            .iter()
            .map(|t| t.description.as_str())
            .collect();

        sqlx::query(
            "INSERT INTO collection_translations (collection_id, language_code, title, description)
            SELECT $1, * FROM UNNEST($2::text[], $3::text[], $4::text[])
            ON CONFLICT (collection_id, language_code) DO UPDATE SET
                title       = EXCLUDED.title,
                description = EXCLUDED.description",
        )
        .bind(collection_id)
        .bind(&language_codes[..])
        .bind(&titles[..])
        .bind(&descriptions[..])
        .execute(self.db)
        .await?;

        Ok(())
    }

    async fn attach_item_translations(
        &self,
        items: Vec<CollectionItem>,
    ) -> Result<Vec<CollectionItemWithTranslations>, DatabaseError> {
        if items.is_empty() {
            return Ok(vec![]);
        }

        let item_ids: Vec<Uuid> = items.iter().map(|i| i.id).collect();
        let all_translations = sqlx::query_as::<_, CollectionItemTranslation>(
            "SELECT * FROM collection_item_translations WHERE collection_item_id = ANY($1)",
        )
        .bind(&item_ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<CollectionItemTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map
                .entry(t.collection_item_id)
                .or_default()
                .push(t);
        }

        Ok(items
            .into_iter()
            .map(|i| {
                let translations = translation_map.remove(&i.id).unwrap_or_default();
                CollectionItemWithTranslations {
                    item: i,
                    translations,
                }
            })
            .collect())
    }

    async fn fetch_item_translations_for(
        &self,
        item_id: Uuid,
    ) -> Result<Vec<CollectionItemTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, CollectionItemTranslation>(
            "SELECT * FROM collection_item_translations WHERE collection_item_id = $1",
        )
        .bind(item_id)
        .fetch_all(self.db)
        .await?)
    }

    async fn upsert_item_translations(
        &self,
        item_id: Uuid,
        translations: &[CollectionItemTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let comments: Vec<Option<&str>> =
            translations.iter().map(|t| t.comment.as_deref()).collect();

        sqlx::query(
            "INSERT INTO collection_item_translations (collection_item_id, language_code, comment)
            SELECT $1, * FROM UNNEST($2::text[], $3::text[])
            ON CONFLICT (collection_item_id, language_code) DO UPDATE SET
                comment = EXCLUDED.comment",
        )
        .bind(item_id)
        .bind(&language_codes[..])
        .bind(&comments[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}
