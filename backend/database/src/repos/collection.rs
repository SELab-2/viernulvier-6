use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        collection::{Collection, CollectionCreate},
        collection_item::{CollectionItem, CollectionItemCreate},
    },
};

pub struct CollectionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> CollectionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Collection>, DatabaseError> {
        Ok(sqlx::query_as::<_, Collection>(
            "SELECT * FROM collections ORDER BY created_at DESC LIMIT $1",
        )
        .bind(limit as i64)
        .fetch_all(self.db)
        .await?)
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Collection, DatabaseError> {
        sqlx::query_as::<_, Collection>("SELECT * FROM collections WHERE id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn insert(&self, data: CollectionCreate) -> Result<Collection, DatabaseError> {
        Ok(sqlx::query_as::<_, Collection>(
            "INSERT INTO collections (slug, title_nl, title_en, description_nl, description_en) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        )
        .bind(data.slug)
        .bind(data.title_nl)
        .bind(data.title_en)
        .bind(data.description_nl)
        .bind(data.description_en)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn update(&self, id: Uuid, data: CollectionCreate) -> Result<Collection, DatabaseError> {
        sqlx::query_as::<_, Collection>(
            "UPDATE collections SET slug = $2, title_nl = $3, title_en = $4, description_nl = $5, description_en = $6, updated_at = NOW() WHERE id = $1 RETURNING *",
        )
        .bind(id)
        .bind(data.slug)
        .bind(data.title_nl)
        .bind(data.title_en)
        .bind(data.description_nl)
        .bind(data.description_en)
        .fetch_optional(self.db)
        .await?
        .ok_or(DatabaseError::NotFound)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM collections WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn items_for(&self, collection_id: Uuid) -> Result<Vec<CollectionItem>, DatabaseError> {
        Ok(sqlx::query_as::<_, CollectionItem>(
            "SELECT * FROM collection_items WHERE collection_id = $1 ORDER BY position ASC",
        )
        .bind(collection_id)
        .fetch_all(self.db)
        .await?)
    }

    pub async fn items_for_collections(&self, collection_ids: &[Uuid]) -> Result<Vec<CollectionItem>, DatabaseError> {
        Ok(sqlx::query_as::<_, CollectionItem>(
            "SELECT * FROM collection_items WHERE collection_id = ANY($1) ORDER BY position ASC",
        )
        .bind(collection_ids)
        .fetch_all(self.db)
        .await?)
    }

    pub async fn add_item(&self, item: CollectionItemCreate) -> Result<CollectionItem, DatabaseError> {
        Ok(sqlx::query_as::<_, CollectionItem>(
            "INSERT INTO collection_items (collection_id, content_id, content_type, position, comment_nl, comment_en) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        )
        .bind(item.collection_id)
        .bind(item.content_id)
        .bind(item.content_type)
        .bind(item.position)
        .bind(item.comment_nl)
        .bind(item.comment_en)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn delete_item(
        &self,
        collection_id: Uuid,
        item_id: Uuid,
    ) -> Result<(), DatabaseError> {
        let res =
            sqlx::query("DELETE FROM collection_items WHERE id = $1 AND collection_id = $2")
                .bind(item_id)
                .bind(collection_id)
                .execute(self.db)
                .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }
}
