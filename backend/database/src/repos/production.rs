use std::collections::HashMap;

use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::production::{
        Production, ProductionCreate, ProductionTranslation, ProductionTranslationData,
        ProductionWithTranslations,
    },
};

pub struct ProductionRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ProductionRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn by_id(&self, id: Uuid) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = Production::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)?;

        let translations = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations,
        })
    }

    pub async fn all(&self, limit: usize) -> Result<Vec<ProductionWithTranslations>, DatabaseError> {
        let productions = Production::select().limit(limit).fetch_all(self.db).await?;

        if productions.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = productions.iter().map(|p| p.id).collect();

        let all_translations = sqlx::query_as::<_, ProductionTranslation>(
            "SELECT * FROM production_translations WHERE production_id = ANY($1)",
        )
        .bind(&ids[..])
        .fetch_all(self.db)
        .await?;

        let mut translation_map: HashMap<Uuid, Vec<ProductionTranslation>> = HashMap::new();
        for t in all_translations {
            translation_map.entry(t.production_id).or_default().push(t);
        }

        Ok(productions
            .into_iter()
            .map(|p| {
                let translations = translation_map.remove(&p.id).unwrap_or_default();
                ProductionWithTranslations {
                    production: p,
                    translations,
                }
            })
            .collect())
    }

    pub async fn insert(
        &self,
        production: ProductionCreate,
        translations: Vec<ProductionTranslationData>,
    ) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = production.insert(self.db).await?;
        self.upsert_translations(production.id, &translations).await?;
        let translation_rows = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations: translation_rows,
        })
    }

    pub async fn update(
        &self,
        production: Production,
        translations: Vec<ProductionTranslationData>,
    ) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = production.update_all_fields(self.db).await?;
        self.upsert_translations(production.id, &translations).await?;
        let translation_rows = self.fetch_translations_for(production.id).await?;

        Ok(ProductionWithTranslations {
            production,
            translations: translation_rows,
        })
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM productions WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn by_source_id(
        &self,
        source_id: i32,
    ) -> Result<Option<ProductionWithTranslations>, DatabaseError> {
        let Some(production) = Production::select()
            .where_("source_id = $1")
            .bind(source_id)
            .fetch_optional(self.db)
            .await?
        else {
            return Ok(None);
        };

        let translations = self.fetch_translations_for(production.id).await?;

        Ok(Some(ProductionWithTranslations {
            production,
            translations,
        }))
    }

    async fn fetch_translations_for(
        &self,
        production_id: Uuid,
    ) -> Result<Vec<ProductionTranslation>, DatabaseError> {
        Ok(sqlx::query_as::<_, ProductionTranslation>(
            "SELECT * FROM production_translations WHERE production_id = $1",
        )
        .bind(production_id)
        .fetch_all(self.db)
        .await?)
    }

    async fn upsert_translations(
        &self,
        production_id: Uuid,
        translations: &[ProductionTranslationData],
    ) -> Result<(), DatabaseError> {
        for t in translations {
            sqlx::query(
                "INSERT INTO production_translations (
                    production_id, language_code,
                    supertitle, title, artist, meta_title, meta_description,
                    tagline, teaser, description, description_extra, description_2,
                    quote, quote_source, programme, info, description_short
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (production_id, language_code) DO UPDATE SET
                    supertitle        = EXCLUDED.supertitle,
                    title             = EXCLUDED.title,
                    artist            = EXCLUDED.artist,
                    meta_title        = EXCLUDED.meta_title,
                    meta_description  = EXCLUDED.meta_description,
                    tagline           = EXCLUDED.tagline,
                    teaser            = EXCLUDED.teaser,
                    description       = EXCLUDED.description,
                    description_extra = EXCLUDED.description_extra,
                    description_2     = EXCLUDED.description_2,
                    quote             = EXCLUDED.quote,
                    quote_source      = EXCLUDED.quote_source,
                    programme         = EXCLUDED.programme,
                    info              = EXCLUDED.info,
                    description_short = EXCLUDED.description_short",
            )
            .bind(production_id)
            .bind(&t.language_code)
            .bind(&t.supertitle)
            .bind(&t.title)
            .bind(&t.artist)
            .bind(&t.meta_title)
            .bind(&t.meta_description)
            .bind(&t.tagline)
            .bind(&t.teaser)
            .bind(&t.description)
            .bind(&t.description_extra)
            .bind(&t.description_2)
            .bind(&t.quote)
            .bind(&t.quote_source)
            .bind(&t.programme)
            .bind(&t.info)
            .bind(&t.description_short)
            .execute(self.db)
            .await?;
        }

        Ok(())
    }
}
