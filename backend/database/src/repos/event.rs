use chrono::{DateTime, Utc};
use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::event::{Event, EventCreate},
};

pub struct EventRepo<'a> {
    db: &'a PgPool,
}

impl<'a> EventRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn count(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM events")
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }

    pub async fn bounds(
        &self,
    ) -> Result<(Option<DateTime<Utc>>, Option<DateTime<Utc>>), DatabaseError> {
        let (oldest, newest) = sqlx::query_as::<_, (Option<DateTime<Utc>>, Option<DateTime<Utc>>)>(
            "SELECT MIN(starts_at), MAX(starts_at) FROM events",
        )
        .fetch_one(self.db)
        .await?;

        Ok((oldest, newest))
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Event, DatabaseError> {
        Event::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(
        &self,
        limit: usize,
        id_cursor: Option<Uuid>,
    ) -> Result<Vec<Event>, DatabaseError> {
        let mut select = Event::select().limit(limit).order_desc("id");

        if let Some(id_cursor) = id_cursor {
            select = select.where_("id < $1").bind(id_cursor);
        }

        let events = select.fetch_all(self.db).await?;

        Ok(events)
    }

    pub async fn insert(&self, event: EventCreate) -> Result<Event, DatabaseError> {
        Ok(event.insert(self.db).await?)
    }

    pub async fn update(&self, event: Event) -> Result<Event, DatabaseError> {
        Ok(event.update_all_fields(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Event>, DatabaseError> {
        Ok(Event::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM events WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn by_production(&self, production_id: Uuid) -> Result<Vec<Event>, DatabaseError> {
        Ok(Event::select()
            .where_("production_id = $1")
            .bind(production_id)
            .fetch_all(self.db)
            .await?)
    }
}
