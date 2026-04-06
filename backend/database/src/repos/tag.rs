use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{entity_type::EntityType, tag::TaxonomyRow},
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
}
