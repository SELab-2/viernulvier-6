use std::collections::HashMap;

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

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Event>, DatabaseError> {
        Ok(Event::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn upsert_by_source_id(&self, event: EventCreate) -> Result<Event, DatabaseError> {
        let Some(source_id) = event.source_id else {
            return self.insert(event).await;
        };

        match self.by_source_id(source_id).await? {
            Some(existing) => Ok(Event {
                id: existing.id,
                source_id: event.source_id,
                created_at: event.created_at,
                updated_at: event.updated_at,
                starts_at: event.starts_at,
                ends_at: event.ends_at,
                intermission_at: event.intermission_at,
                doors_at: event.doors_at,
                vendor_id: event.vendor_id,
                box_office_id: event.box_office_id,
                uitdatabank_id: event.uitdatabank_id,
                max_tickets_per_order: event.max_tickets_per_order,
                production_id: event.production_id,
                status: event.status,
            }
            .update_all_fields(self.db)
            .await?),
            None => self.insert(event).await,
        }
    }

    pub async fn update(&self, event: Event) -> Result<Event, DatabaseError> {
        Ok(event.update_all_fields(self.db).await?)
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

    pub async fn hall_ids_for(&self, event_id: Uuid) -> Result<Vec<Uuid>, DatabaseError> {
        Ok(
            sqlx::query_scalar::<_, Uuid>(
                "SELECT hall_id FROM event_halls WHERE event_id = $1",
            )
            .bind(event_id)
            .fetch_all(self.db)
            .await?,
        )
    }

    pub async fn hall_ids_for_many(
        &self,
        event_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<Uuid>>, DatabaseError> {
        let rows = sqlx::query_as::<_, (Uuid, Uuid)>(
            "SELECT event_id, hall_id FROM event_halls WHERE event_id = ANY($1)",
        )
        .bind(event_ids)
        .fetch_all(self.db)
        .await?;

        let mut map: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for (event_id, hall_id) in rows {
            map.entry(event_id).or_default().push(hall_id);
        }

        Ok(map)
    }

    pub async fn sync_halls(
        &self,
        event_id: Uuid,
        hall_ids: Vec<Uuid>,
    ) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM event_halls WHERE event_id = $1")
            .bind(event_id)
            .execute(self.db)
            .await?;

        if hall_ids.is_empty() {
            return Ok(());
        }

        let event_ids_repeated: Vec<Uuid> = vec![event_id; hall_ids.len()];

        sqlx::query(
            "INSERT INTO event_halls (event_id, hall_id)
             SELECT * FROM UNNEST($1::uuid[], $2::uuid[])
             ON CONFLICT DO NOTHING",
        )
        .bind(&event_ids_repeated[..])
        .bind(&hall_ids[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}
