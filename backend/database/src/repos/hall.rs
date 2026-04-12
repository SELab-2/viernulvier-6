use ormlite::{Insert, Model};
use sqlx::PgPool;
use tracing::debug;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        cursor::CursorData,
        hall::{Hall, HallCreate, HallSearch, HallWithScore},
    },
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

    pub async fn all(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        search: HallSearch,
    ) -> Result<(Vec<Hall>, Option<CursorData>), DatabaseError> {
        let limit: i64 = (limit + 1).into();

        let (halls, next_cursor): (Vec<Hall>, Option<CursorData>) = if let Some(search_q) = search.q
        {
            debug!("querying halls with search: '{search_q}'");

            let mut query = sqlx::QueryBuilder::new("SELECT h.*, ");

            query
                .push_bind(&search_q)
                .push(" <<-> h.name AS distance_score ")
                .push("FROM halls h ")
                .push("WHERE ")
                .push_bind(&search_q)
                .push(" <% h.name ");

            if let Some(cursor) = cursor
                && let Some(score) = cursor.score
            {
                query
                    .push("AND ((")
                    .push_bind(&search_q)
                    .push(" <<-> h.name) > ")
                    .push_bind(score);

                query
                    .push(" OR ((")
                    .push_bind(&search_q)
                    .push(" <<-> h.name) = ")
                    .push_bind(score)
                    .push(" AND id < ")
                    .push_bind(cursor.id)
                    .push(")) ");
            }

            query
                .push("ORDER BY distance_score ASC, id DESC LIMIT ")
                .push_bind(limit);

            debug!("halls query: {}", query.sql());

            let mut halls_with_score: Vec<HallWithScore> =
                query.build_query_as().fetch_all(self.db).await?;

            let next_cursor = if halls_with_score.len() == limit as usize {
                halls_with_score.pop();
                halls_with_score.last().map(|h| CursorData {
                    id: h.hall.id,
                    score: Some(h.distance_score),
                })
            } else {
                None
            };

            let halls = halls_with_score.into_iter().map(|h| h.hall).collect();

            (halls, next_cursor)
        } else {
            debug!("querying halls normally");

            let mut select = Hall::select().limit(limit as usize).order_desc("id");

            if let Some(cursor) = cursor {
                select = select.where_("id < $1").bind(cursor.id);
            }

            let mut halls = select.fetch_all(self.db).await?;

            let next_cursor = if halls.len() == limit as usize {
                halls.pop();
                halls.last().map(|h| CursorData {
                    id: h.id,
                    score: None,
                })
            } else {
                None
            };

            (halls, next_cursor)
        };

        Ok((halls, next_cursor))
    }

    pub async fn insert(&self, hall: HallCreate) -> Result<Hall, DatabaseError> {
        Ok(hall.insert(self.db).await?)
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

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Hall>, DatabaseError> {
        Ok(Hall::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }
}
