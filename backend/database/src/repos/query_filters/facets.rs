use sqlx::{Database, Postgres, QueryBuilder};

use crate::models::{entity_type::EntityType, facet::Facet, filtering::facets::FacetFilters};

pub trait AddFacetFilters<'args, Db> {
    /// Applies additional filters for the search
    ///
    /// use it after an existing where condition\
    /// adds to the query: ` AND EXISTS <...> AND EXISTS <...> `
    ///
    /// the `id_column` argument is the column containing the primary key of the entity
    fn apply_facet_filters(
        &mut self,
        entity_type: EntityType,
        id_column: &'args str,
        filters: &'args FacetFilters,
    ) -> &mut QueryBuilder<'args, Db>
    where
        Db: Database;
}

impl<'args> AddFacetFilters<'args, Postgres> for QueryBuilder<'args, Postgres> {
    fn apply_facet_filters(
        &mut self,
        entity_type: EntityType,
        id_column: &'args str,
        filters: &'args FacetFilters,
    ) -> &mut Self {
        let filter_facets = [
            (Facet::Discipline,    &filters.disciplines),
            (Facet::Format,        &filters.formats),
            (Facet::Theme,         &filters.themes),
            (Facet::Audience,      &filters.audiences),
            (Facet::Accessibility, &filters.accessibilities),
            (Facet::Language,      &filters.languages),
        ];

        for (facet, tags) in filter_facets {
            if let Some(tags) = tags {
                self.push(" AND EXISTS ")
                    .push(" (SELECT 1 FROM tags ")
                    .push(" INNER JOIN taggings ON tags.id = taggings.tag_id ")
                    .push(" WHERE taggings.entity_type = ")
                    .push_bind(entity_type)
                    // safe since id_column is never user input
                    .push(format_args!(" AND taggings.entity_id = {id_column} "))
                    .push(" AND facet = ")
                    .push_bind(facet)
                    .push(" AND slug = ANY( ")
                    .push_bind(tags)
                    .push(" )) ");
            }
        }

        self
    }
}
