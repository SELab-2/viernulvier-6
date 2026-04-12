use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::event_price::{EventPrice, EventPriceCreate},
};

pub struct EventPriceRepo<'a> {
    db: &'a PgPool,
}

impl<'a> EventPriceRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<EventPrice, DatabaseError> {
        EventPrice::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<EventPrice>, DatabaseError> {
        Ok(EventPrice::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn by_event(&self, event_id: Uuid) -> Result<Vec<EventPrice>, DatabaseError> {
        Ok(EventPrice::select()
            .where_("event_id = $1")
            .bind(event_id)
            .fetch_all(self.db)
            .await?)
    }

    pub async fn insert(&self, event_price: EventPriceCreate) -> Result<EventPrice, DatabaseError> {
        Ok(event_price.insert(self.db).await?)
    }

    pub async fn update(&self, event_price: EventPrice) -> Result<EventPrice, DatabaseError> {
        Ok(event_price.update_all_fields(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<EventPrice>, DatabaseError> {
        Ok(EventPrice::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM event_prices WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }
}
