use ormlite::Model;
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
        Ok(sqlx::query_as::<_, EventPrice>(
            "INSERT INTO event_prices (source_id, event_id, price_id, rank_id, created_at, updated_at, available, amount_cents, box_office_id, contingent_id, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (source_id) DO UPDATE SET
                 event_id      = EXCLUDED.event_id,
                 price_id      = EXCLUDED.price_id,
                 rank_id       = EXCLUDED.rank_id,
                 created_at    = EXCLUDED.created_at,
                 updated_at    = EXCLUDED.updated_at,
                 available     = EXCLUDED.available,
                 amount_cents  = EXCLUDED.amount_cents,
                 box_office_id = EXCLUDED.box_office_id,
                 contingent_id = EXCLUDED.contingent_id,
                 expires_at    = EXCLUDED.expires_at
             RETURNING *",
        )
        .bind(event_price.source_id)
        .bind(event_price.event_id)
        .bind(event_price.price_id)
        .bind(event_price.rank_id)
        .bind(event_price.created_at)
        .bind(event_price.updated_at)
        .bind(event_price.available)
        .bind(event_price.amount_cents)
        .bind(&event_price.box_office_id)
        .bind(event_price.contingent_id)
        .bind(event_price.expires_at)
        .fetch_one(self.db)
        .await?)
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
