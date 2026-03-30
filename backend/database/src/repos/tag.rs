use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::{
        entity_type::EntityType,
        tag::{EntityTagRow, TaxonomyRow},
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

    /// Returns all tags applicable to the given entity type, with their translations.
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

    /// Returns all tags on a specific entity with their translations.
    pub async fn for_entity(
        &self,
        entity_type: EntityType,
        entity_id: Uuid,
    ) -> Result<Vec<EntityTagRow>, DatabaseError> {
        Ok(sqlx::query_as::<_, EntityTagRow>(
            "SELECT
                tg.entity_type,
                tg.entity_id,
                tg.inherited,
                t.facet::text  AS facet_slug,
                t.slug         AS tag_slug,
                t.sort_order   AS tag_sort_order,
                tt.language_code,
                tt.label       AS tag_label,
                fl.label       AS facet_label
            FROM taggings tg
            JOIN tags t ON t.id = tg.tag_id
            JOIN tag_translations tt ON tt.tag_id = t.id
            JOIN facet_labels fl ON fl.facet = t.facet AND fl.language_code = tt.language_code
            WHERE tg.entity_type = $1 AND tg.entity_id = $2
            ORDER BY t.facet, t.sort_order, tt.language_code",
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_all(self.db)
        .await?)
    }
}
