use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::location::{Location, LocationCreate},
};

pub struct LocationRepo<'a> {
    db: &'a PgPool,
}

impl<'a> LocationRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Location, DatabaseError> {
        Location::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Location>, DatabaseError> {
        Ok(Location::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, location: LocationCreate) -> Result<Location, DatabaseError> {
        Ok(location.insert(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Location, DatabaseError> {
        Location::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn update(&self, location: Location) -> Result<Location, DatabaseError> {
        Ok(location.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM locations WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }
}
