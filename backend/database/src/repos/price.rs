use ormlite::Model;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::price::{Price, PriceCreate},
};

pub struct PriceRepo<'a> {
    db: &'a PgPool,
}

impl<'a> PriceRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Price, DatabaseError> {
        Price::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<Price>, DatabaseError> {
        Ok(Price::select().limit(limit).fetch_all(self.db).await?)
    }

    pub async fn insert(&self, price: PriceCreate) -> Result<Price, DatabaseError> {
        Ok(sqlx::query_as::<_, Price>(
            "INSERT INTO prices (source_id, created_at, updated_at, price_type, visibility, code, description_nl, description_en, minimum, maximum, step, display_order, auto_select_combo, include_in_price_range, cineville_box, membership)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (source_id) DO UPDATE SET
                 created_at             = EXCLUDED.created_at,
                 updated_at             = EXCLUDED.updated_at,
                 price_type             = EXCLUDED.price_type,
                 visibility             = EXCLUDED.visibility,
                 code                   = EXCLUDED.code,
                 description_nl         = EXCLUDED.description_nl,
                 description_en         = EXCLUDED.description_en,
                 minimum                = EXCLUDED.minimum,
                 maximum                = EXCLUDED.maximum,
                 step                   = EXCLUDED.step,
                 display_order          = EXCLUDED.display_order,
                 auto_select_combo      = EXCLUDED.auto_select_combo,
                 include_in_price_range = EXCLUDED.include_in_price_range,
                 cineville_box          = EXCLUDED.cineville_box,
                 membership             = EXCLUDED.membership
             RETURNING *",
        )
        .bind(price.source_id)
        .bind(price.created_at)
        .bind(price.updated_at)
        .bind(&price.price_type)
        .bind(&price.visibility)
        .bind(&price.code)
        .bind(&price.description_nl)
        .bind(&price.description_en)
        .bind(price.minimum)
        .bind(price.maximum)
        .bind(price.step)
        .bind(price.display_order)
        .bind(price.auto_select_combo)
        .bind(price.include_in_price_range)
        .bind(price.cineville_box)
        .bind(&price.membership)
        .fetch_one(self.db)
        .await?)
    }

    pub async fn update(&self, price: Price) -> Result<Price, DatabaseError> {
        Ok(price.update_all_fields(self.db).await?)
    }

    pub async fn by_source_id(&self, source_id: i32) -> Result<Option<Price>, DatabaseError> {
        Ok(Price::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?)
    }
}
