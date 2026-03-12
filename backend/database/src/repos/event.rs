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

    pub async fn by_id(&self, id: Uuid) -> Result<Event, DatabaseError> {
        Event::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Event>, DatabaseError> {
        Ok(Event::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, event: EventCreate) -> Result<Event, DatabaseError> {
        Ok(event.insert(self.db).await?)
    }

    pub async fn by_production(&self, production_id: Uuid) -> Result<Vec<Event>, DatabaseError> {
        Ok(Event::select().where_("production_id = $1").bind(production_id).fetch_all(self.db).await?)
    }
}