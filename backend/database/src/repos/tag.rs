use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::tag::{EntityTag, TagWithFacet},
};

pub struct TagRepo<'a> {
    db: &'a PgPool,
}

impl<'a> TagRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn for_entity(
        &self,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<Vec<EntityTag>, DatabaseError> {
        // The `!` suffix overrides sqlx's inferred nullability.
        // Postgres cannot propagate NOT NULL constraints through views, so sqlx
        // conservatively marks all view columns as nullable. All source columns
        // are NOT NULL in their underlying tables (taggings, tags, facets).
        Ok(sqlx::query_as!(
            EntityTag,
            r#"
            SELECT
                entity_type   AS "entity_type!",
                entity_id     AS "entity_id!",
                inherited     AS "inherited!",
                facet_slug    AS "facet_slug!",
                facet_label   AS "facet_label!",
                tag_slug      AS "tag_slug!",
                tag_label     AS "tag_label!",
                sort_order    AS "sort_order!"
            FROM entity_tags
            WHERE entity_type = $1 AND entity_id = $2
            "#,
            entity_type,
            entity_id
        )
        .fetch_all(self.db)
        .await?)
    }

    pub async fn with_facets(&self) -> Result<Vec<TagWithFacet>, DatabaseError> {
        Ok(sqlx::query_as!(
            TagWithFacet,
            r#"
            SELECT
                f.slug       AS facet_slug,
                f.label      AS facet_label,
                f.sort_order AS facet_sort_order,
                t.slug       AS tag_slug,
                t.label      AS tag_label,
                t.sort_order AS tag_sort_order
            FROM tags t
            JOIN facets f ON f.id = t.facet_id
            ORDER BY f.sort_order, t.sort_order
            "#
        )
        .fetch_all(self.db)
        .await?)
    }

    pub async fn with_facets_for_entity(
        &self,
        entity_type: &str,
    ) -> Result<Vec<TagWithFacet>, DatabaseError> {
        Ok(sqlx::query_as!(
            TagWithFacet,
            r#"
            SELECT
                f.slug       AS facet_slug,
                f.label      AS facet_label,
                f.sort_order AS facet_sort_order,
                t.slug       AS tag_slug,
                t.label      AS tag_label,
                t.sort_order AS tag_sort_order
            FROM tags t
            JOIN facets f ON f.id = t.facet_id
            JOIN facet_entity_types fet ON fet.facet_id = f.id
            WHERE fet.entity_type = $1
            ORDER BY f.sort_order, t.sort_order
            "#,
            entity_type
        )
        .fetch_all(self.db)
        .await?)
    }
}
