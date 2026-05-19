use std::collections::HashMap;

use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        entity_type::EntityType,
        facet::Facet,
        tag::{EntityTagSlim, TaxonomyRow},
    },
};

pub struct TagRepo<'a> {
    db: &'a PgPool,
}

impl<'a> TagRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    /// Returns all tags with their translations, grouped across all facets.
    pub async fn with_facets(&self) -> Result<Vec<TaxonomyRow>, DatabaseError> {
        Ok(sqlx::query_as::<_, TaxonomyRow>(
            "SELECT
                t.facet::text  AS facet_slug,
                t.slug         AS tag_slug,
                t.sort_order   AS tag_sort_order,
                tt.language_code,
                tt.label       AS tag_label,
                tt.description AS tag_description,
                fl.label       AS facet_label
            FROM tags t
            JOIN tag_translations tt ON tt.tag_id = t.id
            JOIN facet_labels fl ON fl.facet = t.facet AND fl.language_code = tt.language_code
            ORDER BY t.facet, t.sort_order, tt.language_code",
        )
        .fetch_all(self.db)
        .await?)
    }

    pub async fn with_facets_for_entity(
        &self,
        entity_type: EntityType,
    ) -> Result<Vec<TaxonomyRow>, DatabaseError> {
        Ok(sqlx::query_as::<_, TaxonomyRow>(
            "SELECT
                t.facet::text  AS facet_slug,
                t.slug         AS tag_slug,
                t.sort_order   AS tag_sort_order,
                tt.language_code,
                tt.label       AS tag_label,
                tt.description AS tag_description,
                fl.label       AS facet_label
            FROM tags t
            JOIN tag_translations tt ON tt.tag_id = t.id
            JOIN facet_labels fl ON fl.facet = t.facet AND fl.language_code = tt.language_code
            JOIN facet_entity_types fet ON fet.facet = t.facet
            WHERE fet.entity_type = $1
            ORDER BY t.facet, t.sort_order, tt.language_code",
        )
        .bind(entity_type)
        .fetch_all(self.db)
        .await?)
    }

    /// Returns slim tag projections grouped by entity id for a list of entities.
    pub async fn slim_tags_for_entities(
        &self,
        entity_type: EntityType,
        entity_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<EntityTagSlim>>, DatabaseError> {
        if entity_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let rows: Vec<(Uuid, String, String)> = sqlx::query_as(
            "SELECT tg.entity_id, t.slug, t.facet::text AS facet
             FROM taggings tg
             JOIN tags t ON t.id = tg.tag_id
             WHERE tg.entity_type = $1 AND tg.entity_id = ANY($2)
             ORDER BY tg.entity_id, t.facet, t.sort_order",
        )
        .bind(entity_type)
        .bind(entity_ids)
        .fetch_all(self.db)
        .await?;

        let mut grouped: HashMap<Uuid, Vec<EntityTagSlim>> = HashMap::new();
        for (entity_id, slug, facet) in rows {
            grouped
                .entry(entity_id)
                .or_default()
                .push(EntityTagSlim { slug, facet });
        }
        Ok(grouped)
    }

    /// Returns pre-grouped facets+tags JSONB for a single entity via the SQL function.
    pub async fn entity_facets(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
    ) -> Result<JsonValue, DatabaseError> {
        Ok(
            sqlx::query_scalar::<_, JsonValue>("SELECT entity_facets($1, $2)")
                .bind(entity_type)
                .bind(entity_id)
                .fetch_one(self.db)
                .await?,
        )
    }

    pub async fn replace_tags(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
        tag_slugs: &[String],
    ) -> Result<JsonValue, DatabaseError> {
        let mut seen = std::collections::HashSet::new();
        let unique_slugs: Vec<&String> = tag_slugs
            .iter()
            .filter(|s| seen.insert(s.as_str()))
            .collect();

        let mut tx = self.db.begin().await?;

        let exists: bool = sqlx::query_scalar(&format!(
            "SELECT EXISTS(SELECT 1 FROM {} WHERE id = $1)",
            entity_type.table()
        ))
        .bind(entity_id)
        .fetch_one(&mut *tx)
        .await?;

        if !exists {
            return Err(DatabaseError::NotFound);
        }

        sqlx::query("DELETE FROM taggings WHERE entity_type = $1 AND entity_id = $2")
            .bind(entity_type)
            .bind(entity_id)
            .execute(&mut *tx)
            .await?;

        for slug in &unique_slugs {
            let result = sqlx::query(
                "INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
                 SELECT t.id, $1, $2, false
                 FROM tags t
                 JOIN facet_entity_types fet ON fet.facet = t.facet AND fet.entity_type = $1
                 WHERE t.slug = $3",
            )
            .bind(entity_type)
            .bind(entity_id)
            .bind(*slug)
            .execute(&mut *tx)
            .await?;

            if result.rows_affected() == 0 {
                return Err(DatabaseError::BadRequest(format!(
                    "unknown or inapplicable tag slug: '{slug}'"
                )));
            }
        }

        tx.commit().await?;

        self.entity_facets(entity_type, entity_id).await
    }

    pub async fn next_sort_order(&self, facet: Facet) -> Result<i32, DatabaseError> {
        let max: Option<i32> =
            sqlx::query_scalar("SELECT MAX(sort_order) FROM tags WHERE facet = $1")
                .bind(facet)
                .fetch_one(self.db)
                .await?;
        Ok(max.unwrap_or(0) + 1)
    }

    /// Returns `DatabaseError::Conflict` if (facet, slug) already exists.
    pub async fn create_tag(
        &self,
        facet: Facet,
        slug: &str,
        sort_order: i32,
    ) -> Result<Uuid, DatabaseError> {
        let row: Option<(Uuid,)> = sqlx::query_as(
            "INSERT INTO tags (facet, slug, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (facet, slug) DO NOTHING
             RETURNING id",
        )
        .bind(facet)
        .bind(slug)
        .bind(sort_order)
        .fetch_optional(self.db)
        .await?;

        row.map(|(id,)| id)
            .ok_or_else(|| DatabaseError::Conflict("tag slug already exists in this facet".into()))
    }

    pub async fn set_tag_translations(
        &self,
        tag_id: Uuid,
        translations: &[(String, String)],
    ) -> Result<(), DatabaseError> {
        for (language_code, label) in translations {
            sqlx::query(
                "INSERT INTO tag_translations (tag_id, language_code, label)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (tag_id, language_code) DO UPDATE SET label = EXCLUDED.label",
            )
            .bind(tag_id)
            .bind(language_code)
            .bind(label)
            .execute(self.db)
            .await?;
        }
        Ok(())
    }

    /// Returns `DatabaseError::NotFound` if slug doesn't exist.
    pub async fn update_tag_translations(
        &self,
        slug: &str,
        translations: &[(String, String)],
    ) -> Result<(), DatabaseError> {
        let tag_id: Uuid =
            sqlx::query_scalar("SELECT id FROM tags WHERE slug = $1")
                .bind(slug)
                .fetch_one(self.db)
                .await
                .map_err(|e| match e {
                    sqlx::Error::RowNotFound => DatabaseError::NotFound,
                    other => DatabaseError::Sqlx(other),
                })?;
        self.set_tag_translations(tag_id, translations).await
    }

    pub async fn usage_count(&self, slug: &str) -> Result<i64, DatabaseError> {
        Ok(sqlx::query_scalar(
            "SELECT COUNT(*)
             FROM taggings
             WHERE tag_id = (SELECT id FROM tags WHERE slug = $1)",
        )
        .bind(slug)
        .fetch_one(self.db)
        .await?)
    }

    /// Returns `DatabaseError::NotFound` if slug doesn't exist.
    pub async fn delete_tag(&self, slug: &str) -> Result<(), DatabaseError> {
        let result = sqlx::query("DELETE FROM tags WHERE slug = $1")
            .bind(slug)
            .execute(self.db)
            .await?;
        if result.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }
        Ok(())
    }
}
