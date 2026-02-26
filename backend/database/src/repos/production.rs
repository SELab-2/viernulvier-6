use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::production::{Production, ProductionCreate},
};

pub struct ProductionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ProductionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Production, DatabaseError> {
        sqlx::query_as("SELECT * FROM productions WHERE id = $1 LIMIT 1;")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn all(&self, limit: i64) -> Result<Vec<Production>, DatabaseError> {
        Ok(sqlx::query_as("SELECT * FROM productions LIMIT $1;")
            .bind(limit)
            .fetch_all(self.db)
            .await?)
    }

    pub async fn insert(&self, production: ProductionCreate) -> Result<Production, DatabaseError> {
        let inserted_production = sqlx::query_as!(
            Production,
            r#"
            INSERT INTO productions (
                source_id, slug,
                supertitle_nl, supertitle_en, title_nl, title_en,
                artist_nl, artist_en, meta_title_nl, meta_title_en,
                meta_description_nl, meta_description_en, tagline_nl, tagline_en,
                teaser_nl, teaser_en, description_nl, description_en,
                description_extra_nl, description_extra_en, description_2_nl, description_2_en,
                video_1, video_2, quote_nl, quote_en, quote_source_nl, quote_source_en,
                programme_nl, programme_en, info_nl, info_en,
                description_short_nl, description_short_en, eticket_info,
                uitdatabank_theme, uitdatabank_type
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36, $37
            )
            RETURNING
                id,
                supertitle_nl, supertitle_en, title_nl, title_en,
                artist_nl, artist_en, meta_title_nl, meta_title_en,
                meta_description_nl, meta_description_en, tagline_nl, tagline_en,
                teaser_nl, teaser_en, description_nl, description_en,
                description_extra_nl, description_extra_en, description_2_nl, description_2_en,
                video_1, video_2, quote_nl, quote_en, quote_source_nl, quote_source_en,
                programme_nl, programme_en, info_nl, info_en,
                description_short_nl, description_short_en, eticket_info,
                uitdatabank_theme, uitdatabank_type
            "#,
            production.source_id,
            production.slug,
            production.supertitle_nl,
            production.supertitle_en,
            production.title_nl,
            production.title_en,
            production.artist_nl,
            production.artist_en,
            production.meta_title_nl,
            production.meta_title_en,
            production.meta_description_nl,
            production.meta_description_en,
            production.tagline_nl,
            production.tagline_en,
            production.teaser_nl,
            production.teaser_en,
            production.description_nl,
            production.description_en,
            production.description_extra_nl,
            production.description_extra_en,
            production.description_2_nl,
            production.description_2_en,
            production.video_1,
            production.video_2,
            production.quote_nl,
            production.quote_en,
            production.quote_source_nl,
            production.quote_source_en,
            production.programme_nl,
            production.programme_en,
            production.info_nl,
            production.info_en,
            production.description_short_nl,
            production.description_short_en,
            production.eticket_info,
            production.uitdatabank_theme,
            production.uitdatabank_type
        )
        .fetch_one(self.db)
        .await?;

        Ok(inserted_production)
    }
}
