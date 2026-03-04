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
        sqlx::query_as("SELECT * FROM locations WHERE id = $1 LIMIT 1;")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }
    
    pub async fn all(&self, limit: i64) -> Result<Vec<Location>, DatabaseError> {
        Ok(sqlx::query_as("SELECT * FROM locations LIMIT $1;")
            .bind(limit)
            .fetch_all(self.db)
            .await?)
    }

   pub async fn insert(&self, location: LocationCreate) -> Result<Location, DatabaseError> {
       let inserted_location = sqlx::query_as(
           r#"
           INSERT INTO locations (
                source_id,
                name, code, street, number,
                postal_code, city, country, phone_1,
                phone_2, is_owned_by_viernulvier, uitdatabank_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13
            )
            RETURNING
                id,
                name, code, street, number,
                postal_code, city, country, phone_1,
                phone_2, is_owned_by_viernulvier, uitdatabank_id
           "#,
        )
        .bind(location.source_id)
        .bind(location.base.name)
        .bind(location.base.code)
        .bind(location.base.street)
        .bind(location.base.number)
        .bind(location.base.postal_code)
        .bind(location.base.city)
        .bind(location.base.country)
        .bind(location.base.phone_1)
        .bind(location.base.phone_2)
        .bind(location.base.is_owned_by_viernulvier)
        .bind(location.base.uitdatabank_id)
        .fetch_one(self.db)
        .await?;

       Ok(inserted_location)
   } 
}

