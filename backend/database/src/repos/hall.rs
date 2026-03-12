use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::hall::{Hall, HallCreate},
};

pub struct HallRepo<'a> {
    db: &'a PgPool,
}

impl<'a> HallRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Hall, DatabaseError> {
        Hall::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Hall>, DatabaseError> {
        Ok(Hall::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, hall: HallCreate) -> Result<Hall, DatabaseError> {
        Ok(hall.insert(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Hall>, DatabaseError> {
        Ok(Hall::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn update(&self, hall: Hall) -> Result<Hall, DatabaseError> {
        Ok(hall.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM halls WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }
}
