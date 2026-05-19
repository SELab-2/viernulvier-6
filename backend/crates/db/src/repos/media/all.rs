use tracing::debug;

use crate::{
    error::DatabaseError,
    models::{
        filtering::{cursor::CursorData, sort::Sort},
        media::{Media, MediaSearch, MediaWithScore},
    },
    repos::media::{MediaRepo, push_entity_media_filters},
};

const MEDIA_COLUMNS: &str = "\
    m.id, m.created_at, m.updated_at, \
    m.s3_key, m.mime_type, m.file_size, \
    m.width, m.height, m.checksum, \
    m.alt_text_nl, m.alt_text_en, m.alt_text_fr, \
    m.description_nl, m.description_en, m.description_fr, \
    m.credit_nl, m.credit_en, m.credit_fr, \
    m.geo_latitude, m.geo_longitude, \
    m.parent_id, m.derivative_type, m.gallery_type, m.source_id, \
    m.source_system, m.source_uri, m.source_updated_at";

impl<'a> MediaRepo<'a> {
    /// Return all media, supports filtering and cursor-based pagination.
    pub async fn all(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        search: MediaSearch,
    ) -> Result<(Vec<Media>, Option<CursorData>), DatabaseError> {
        // make the limit 1 higher to check if there is a following page
        let limit: i64 = (limit + 1).into();

        if let Some(ref search_q) = search.q {
            debug!("querying media with search: '{search_q}'");
            self.all_search(limit, cursor, search_q, &search).await
        } else {
            debug!("querying media normally");
            self.all_normal(limit, cursor, &search).await
        }
    }

    /// Search media with a text query.
    ///
    /// When sort is `Relevance`, results are ordered by trigram distance score.
    /// When sort is `Recent` or `Oldest`, results are filtered by the text query
    /// but ordered by id.
    async fn all_search(
        &self,
        limit: i64,
        cursor: Option<CursorData>,
        search_q: &str,
        search: &MediaSearch,
    ) -> Result<(Vec<Media>, Option<CursorData>), DatabaseError> {
        let needs_entity_join =
            search.entity_type.is_some() || search.entity_id.is_some() || search.role.is_some();
        let is_relevance = matches!(search.sort, Sort::Relevance);

        let mut query = sqlx::QueryBuilder::new("SELECT ");
        query.push(MEDIA_COLUMNS);

        if is_relevance {
            query.push(", (");
            query.push_bind(search_q);
            query.push(" <<-> m.full_search_text) as distance_score");
        }

        query.push(" FROM media m ");

        if needs_entity_join {
            query.push("INNER JOIN entity_media em ON em.media_id = m.id ");
        }

        query.push("WHERE ");
        query.push_bind(search_q);
        query.push(" <% m.full_search_text ");

        push_entity_media_filters(
            &mut query,
            search.entity_type.as_ref(),
            search.entity_id.as_ref(),
            search.role.as_deref(),
        );

        if let Some(ref cursor) = cursor {
            if is_relevance {
                if let Some(score) = cursor.score {
                    query.push(" AND ((");
                    query.push_bind(search_q);
                    query.push(" <<-> m.full_search_text) > ");
                    query.push_bind(score);
                    query.push(" OR ((");
                    query.push_bind(search_q);
                    query.push(" <<-> m.full_search_text) = ");
                    query.push_bind(score);
                    query.push(" AND m.id < ");
                    query.push_bind(cursor.id);
                    query.push(")) ");
                }
            } else {
                let cursor_cmp = match search.sort {
                    Sort::Oldest => ">",
                    _ => "<",
                };
                query.push(" AND m.id ");
                query.push(cursor_cmp);
                query.push(" ");
                query.push_bind(cursor.id);
            }
        }

        if is_relevance {
            query.push(" ORDER BY distance_score ASC, m.id DESC");
        } else {
            match search.sort {
                Sort::Oldest => query.push(" ORDER BY m.id ASC"),
                _ => query.push(" ORDER BY m.id DESC"),
            };
        }

        query.push(" LIMIT ");
        query.push_bind(limit);

        debug!("media search query: {}", query.sql());

        if is_relevance {
            let mut results: Vec<MediaWithScore> =
                query.build_query_as().fetch_all(self.db).await?;

            let next_cursor = if results.len() == limit as usize {
                results.pop();
                results.last().map(|r| CursorData {
                    id: r.media.id,
                    score: Some(r.distance_score),
                })
            } else {
                None
            };

            Ok((results.into_iter().map(|r| r.media).collect(), next_cursor))
        } else {
            let mut media: Vec<Media> = query.build_query_as().fetch_all(self.db).await?;

            let next_cursor = if media.len() == limit as usize {
                media.pop();
                media.last().map(|m| CursorData {
                    id: m.id,
                    score: None,
                })
            } else {
                None
            };

            Ok((media, next_cursor))
        }
    }

    /// List media without a text query. Pure id-based pagination.
    async fn all_normal(
        &self,
        limit: i64,
        cursor: Option<CursorData>,
        search: &MediaSearch,
    ) -> Result<(Vec<Media>, Option<CursorData>), DatabaseError> {
        let needs_entity_join =
            search.entity_type.is_some() || search.entity_id.is_some() || search.role.is_some();

        let (cursor_cmp, order_direction) = match search.sort {
            Sort::Oldest => (">", "ASC"),
            Sort::Recent | Sort::Relevance => ("<", "DESC"),
        };

        let mut query = sqlx::QueryBuilder::new("SELECT ");
        query.push(MEDIA_COLUMNS);
        query.push(" FROM media m ");

        if needs_entity_join {
            query.push("INNER JOIN entity_media em ON em.media_id = m.id ");
        }

        query.push("WHERE 1=1 ");

        push_entity_media_filters(
            &mut query,
            search.entity_type.as_ref(),
            search.entity_id.as_ref(),
            search.role.as_deref(),
        );

        if let Some(ref cursor) = cursor {
            query.push(format_args!(" AND m.id {cursor_cmp} "));
            query.push_bind(cursor.id);
        }

        query.push(format_args!(" ORDER BY m.id {order_direction} LIMIT "));
        query.push_bind(limit);

        debug!("media normal query: {}", query.sql());

        let mut media: Vec<Media> = query.build_query_as().fetch_all(self.db).await?;

        let next_cursor = if media.len() == limit as usize {
            media.pop();
            media.last().map(|m| CursorData {
                id: m.id,
                score: None,
            })
        } else {
            None
        };

        Ok((media, next_cursor))
    }
}
