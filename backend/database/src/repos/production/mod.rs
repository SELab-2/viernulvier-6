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

pub mod all;

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

    pub async fn insert(
        &self,
        production: ProductionCreate,
        translations: Vec<ProductionTranslationData>,
    ) -> Result<ProductionWithTranslations, DatabaseError> {
        let production = production.insert(self.db).await?;
        self.upsert_translations(production.id, &translations)
            .await?;
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
        self.upsert_translations(production.id, &translations)
            .await?;
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

    /// Insert or update translations for a production. Clears all translations when the list is empty.
    async fn upsert_translations(
        &self,
        production_id: Uuid,
        translations: &[ProductionTranslationData],
    ) -> Result<(), DatabaseError> {
        if translations.is_empty() {
            sqlx::query("DELETE FROM production_translations WHERE production_id = $1")
                .bind(production_id)
                .execute(self.db)
                .await?;
            return Ok(());
        }

        let language_codes: Vec<&str> = translations
            .iter()
            .map(|t| t.language_code.as_str())
            .collect();
        let supertitles: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.supertitle.as_deref())
            .collect();
        let titles: Vec<Option<&str>> = translations.iter().map(|t| t.title.as_deref()).collect();
        let artists: Vec<Option<&str>> = translations.iter().map(|t| t.artist.as_deref()).collect();
        let meta_titles: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.meta_title.as_deref())
            .collect();
        let meta_descriptions: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.meta_description.as_deref())
            .collect();
        let taglines: Vec<Option<&str>> =
            translations.iter().map(|t| t.tagline.as_deref()).collect();
        let teasers: Vec<Option<&str>> = translations.iter().map(|t| t.teaser.as_deref()).collect();
        let descriptions: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description.as_deref())
            .collect();
        let description_extras: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_extra.as_deref())
            .collect();
        let description_2s: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_2.as_deref())
            .collect();
        let quotes: Vec<Option<&str>> = translations.iter().map(|t| t.quote.as_deref()).collect();
        let quote_sources: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.quote_source.as_deref())
            .collect();
        let programmes: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.programme.as_deref())
            .collect();
        let infos: Vec<Option<&str>> = translations.iter().map(|t| t.info.as_deref()).collect();
        let description_shorts: Vec<Option<&str>> = translations
            .iter()
            .map(|t| t.description_short.as_deref())
            .collect();

        sqlx::query(
            "INSERT INTO production_translations (
                production_id, language_code,
                supertitle, title, artist, meta_title, meta_description,
                tagline, teaser, description, description_extra, description_2,
                quote, quote_source, programme, info, description_short
            )
            SELECT $1, * FROM UNNEST(
                $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                $7::text[], $8::text[], $9::text[], $10::text[], $11::text[],
                $12::text[], $13::text[], $14::text[], $15::text[], $16::text[],
                $17::text[]
            )
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
        .bind(&language_codes[..])
        .bind(&supertitles[..])
        .bind(&titles[..])
        .bind(&artists[..])
        .bind(&meta_titles[..])
        .bind(&meta_descriptions[..])
        .bind(&taglines[..])
        .bind(&teasers[..])
        .bind(&descriptions[..])
        .bind(&description_extras[..])
        .bind(&description_2s[..])
        .bind(&quotes[..])
        .bind(&quote_sources[..])
        .bind(&programmes[..])
        .bind(&infos[..])
        .bind(&description_shorts[..])
        .execute(self.db)
        .await?;

        Ok(())
    }
}
