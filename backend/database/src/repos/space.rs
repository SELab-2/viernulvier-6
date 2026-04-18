use ormlite::Model;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::space::{Space, SpaceCreate},
};

pub struct SpaceRepo<'a> {
    db: &'a PgPool,
}

impl<'a> SpaceRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Space, DatabaseError> {
        Space::select()
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
    ) -> Result<Vec<Space>, DatabaseError> {
        let mut select = Space::select().limit(limit).order_desc("id");

        if let Some(id_cursor) = id_cursor {
            select = select.where_("id < $1").bind(id_cursor);
        }

        let spaces = select.fetch_all(self.db).await?;

        Ok(spaces)
    }

    pub async fn insert(&self, space: SpaceCreate) -> Result<Space, DatabaseError> {
        Ok(sqlx::query_as::<_, Space>(
            "INSERT INTO spaces (source_id, name_nl, location_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (source_id) DO UPDATE SET
                 name_nl     = EXCLUDED.name_nl,
                 location_id = EXCLUDED.location_id
             RETURNING *",
        )
        .bind(space.source_id)
        .bind(&space.name_nl)
        .bind(space.location_id)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Space>, DatabaseError> {
        Ok(Space::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }

    pub async fn update(&self, space: Space) -> Result<Space, DatabaseError> {
        Ok(space.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM spaces WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }
}
