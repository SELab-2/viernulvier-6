use chrono::NaiveDate;
use ormlite::{Insert, Model};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::DatabaseError,
    models::entity_type::EntityType,
    models::{
        article::{
            Article, ArticleCreate, ArticleRelations, ArticleSearch, ArticleStatus,
            ArticleWithScore,
        },
        filtering::cursor::CursorData,
    },
};

pub struct ArticleRepo<'a> {
    db: &'a PgPool,
}

impl<'a> ArticleRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }

    pub async fn count_published(&self) -> Result<i64, DatabaseError> {
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM articles WHERE status = $1")
            .bind(ArticleStatus::Published)
            .fetch_one(self.db)
            .await?;

        Ok(count)
    }

    pub async fn all(&self) -> Result<Vec<Article>, DatabaseError> {
        Ok(Article::select()
            .order_asc("updated_at")
            .fetch_all(self.db)
            .await?)
    }

    pub async fn by_id(&self, id: Uuid) -> Result<Article, DatabaseError> {
        Article::select()
            .where_("id = $1")
            .bind(id)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn by_slug(&self, slug: &str) -> Result<Article, DatabaseError> {
        Article::select()
            .where_("slug = $1")
            .bind(slug)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn by_slug_published(&self, slug: &str) -> Result<Article, DatabaseError> {
        Article::select()
            .where_("slug = $1 AND status = $2")
            .bind(slug)
            .bind(ArticleStatus::Published)
            .fetch_optional(self.db)
            .await?
            .ok_or(DatabaseError::NotFound)
    }

    pub async fn slug_exists(&self, slug: &str) -> Result<bool, DatabaseError> {
        let row = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM articles WHERE slug = $1)",
            slug
        )
        .fetch_one(self.db)
        .await?;
        Ok(row.unwrap_or(false))
    }

    pub async fn slug_exists_excluding(
        &self,
        slug: &str,
        exclude_id: Uuid,
    ) -> Result<bool, DatabaseError> {
        let row = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM articles WHERE slug = $1 AND id != $2)",
            slug,
            exclude_id
        )
        .fetch_one(self.db)
        .await?;
        Ok(row.unwrap_or(false))
    }

    pub async fn insert(&self, article: ArticleCreate) -> Result<Article, DatabaseError> {
        Ok(article.insert(self.db).await?)
    }

    pub async fn update(&self, article: Article) -> Result<Article, DatabaseError> {
        Ok(article.update_all_fields(self.db).await?)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), DatabaseError> {
        let res = sqlx::query("DELETE FROM articles WHERE id = $1")
            .bind(id)
            .execute(self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(DatabaseError::NotFound);
        }

        Ok(())
    }

    pub async fn list_published(
        &self,
        subject_start: Option<NaiveDate>,
        subject_end: Option<NaiveDate>,
        tag_slug: Option<String>,
        related_entity_id: Option<Uuid>,
        related_entity_type: Option<EntityType>,
    ) -> Result<Vec<Article>, DatabaseError> {
        let mut builder =
            sqlx::QueryBuilder::new("SELECT a.* FROM articles a WHERE a.status = 'published'");

        if let Some(end) = subject_end {
            builder.push(" AND (a.subject_period_start IS NULL OR a.subject_period_start <= ");
            builder.push_bind(end);
            builder.push(")");
        }
        if let Some(start) = subject_start {
            builder.push(" AND (a.subject_period_end IS NULL OR a.subject_period_end >= ");
            builder.push_bind(start);
            builder.push(")");
        }

        if let Some(slug) = tag_slug {
            builder.push(
                " AND EXISTS (SELECT 1 FROM taggings t JOIN tags tg ON tg.id = t.tag_id WHERE t.entity_id = a.id AND t.entity_type = 'article' AND tg.slug = ",
            );
            builder.push_bind(slug);
            builder.push(")");
        }

        if let (Some(entity_id), Some(entity_type)) = (related_entity_id, related_entity_type)
            && let (Some(table), Some(col)) = (
                entity_type.article_join_table(),
                entity_type.article_id_column(),
            )
        {
            builder.push(format!(
                " AND EXISTS (SELECT 1 FROM {table} r WHERE r.article_id = a.id AND r.{col} = "
            ));
            builder.push_bind(entity_id);
            builder.push(")");
        }

        builder.push(" ORDER BY a.updated_at DESC");

        Ok(builder
            .build_query_as::<Article>()
            .fetch_all(self.db)
            .await?)
    }

    pub async fn search_published(
        &self,
        limit: u32,
        cursor: Option<CursorData>,
        search: ArticleSearch,
    ) -> Result<(Vec<Article>, Option<CursorData>), DatabaseError> {
        let limit: i64 = (limit + 1).into();

        let ArticleSearch {
            q,
            subject_start,
            subject_end,
            tag_slug,
            related_entity_id,
            related_entity_type,
        } = search;

        let mut builder = sqlx::QueryBuilder::new("SELECT a.*");
        if let Some(ref search_q) = q {
            builder
                .push(", ")
                .push_bind(search_q)
                .push(" <<-> a.title AS distance_score");
        }

        builder.push(" FROM articles a WHERE a.status = 'published'");

        if let Some(end) = subject_end {
            builder.push(" AND (a.subject_period_start IS NULL OR a.subject_period_start <= ");
            builder.push_bind(end);
            builder.push(")");
        }
        if let Some(start) = subject_start {
            builder.push(" AND (a.subject_period_end IS NULL OR a.subject_period_end >= ");
            builder.push_bind(start);
            builder.push(")");
        }

        if let Some(slug) = tag_slug {
            builder.push(
                " AND EXISTS (SELECT 1 FROM taggings t JOIN tags tg ON tg.id = t.tag_id WHERE t.entity_id = a.id AND t.entity_type = 'article' AND tg.slug = ",
            );
            builder.push_bind(slug);
            builder.push(")");
        }

        if let (Some(entity_id), Some(entity_type)) = (related_entity_id, related_entity_type)
            && let (Some(table), Some(col)) = (
                entity_type.article_join_table(),
                entity_type.article_id_column(),
            )
        {
            builder.push(format!(
                " AND EXISTS (SELECT 1 FROM {table} r WHERE r.article_id = a.id AND r.{col} = "
            ));
            builder.push_bind(entity_id);
            builder.push(")");
        }

        let (articles, next_cursor) = if let Some(ref search_q) = q {
            builder
                .push(" AND ")
                .push_bind(search_q)
                .push(" <% a.title");

            if let Some(cursor) = cursor
                && let Some(score) = cursor.score
            {
                builder
                    .push(" AND ((")
                    .push_bind(search_q)
                    .push(" <<-> a.title) > ")
                    .push_bind(score);

                builder
                    .push(" OR ((")
                    .push_bind(search_q)
                    .push(" <<-> a.title) = ")
                    .push_bind(score)
                    .push(" AND a.id < ")
                    .push_bind(cursor.id)
                    .push("))");
            }

            builder
                .push(" ORDER BY distance_score ASC, a.id DESC LIMIT ")
                .push_bind(limit);

            let mut articles_with_score: Vec<ArticleWithScore> =
                builder.build_query_as().fetch_all(self.db).await?;

            let next_cursor = if articles_with_score.len() == limit as usize {
                articles_with_score.pop();
                articles_with_score.last().map(|article| CursorData {
                    id: article.article.id,
                    score: Some(article.distance_score),
                })
            } else {
                None
            };

            let articles = articles_with_score
                .into_iter()
                .map(|article| article.article)
                .collect();

            (articles, next_cursor)
        } else {
            if let Some(cursor) = cursor {
                builder.push(" AND a.id < ");
                builder.push_bind(cursor.id);
            }

            builder.push(" ORDER BY a.id DESC LIMIT ").push_bind(limit);

            let mut articles: Vec<Article> = builder.build_query_as().fetch_all(self.db).await?;

            let next_cursor = if articles.len() == limit as usize {
                articles.pop();
                articles.last().map(|article| CursorData {
                    id: article.id,
                    score: None,
                })
            } else {
                None
            };

            (articles, next_cursor)
        };

        Ok((articles, next_cursor))
    }

    pub async fn get_relations(&self, article_id: Uuid) -> Result<ArticleRelations, DatabaseError> {
        let production_ids = sqlx::query_scalar!(
            "SELECT production_id FROM articles_about_productions WHERE article_id = $1",
            article_id
        )
        .fetch_all(self.db)
        .await?;

        let artist_ids = sqlx::query_scalar!(
            "SELECT artist_id FROM articles_about_artists WHERE article_id = $1",
            article_id
        )
        .fetch_all(self.db)
        .await?;

        let location_ids = sqlx::query_scalar!(
            "SELECT location_id FROM articles_about_locations WHERE article_id = $1",
            article_id
        )
        .fetch_all(self.db)
        .await?;

        let event_ids = sqlx::query_scalar!(
            "SELECT event_id FROM articles_about_events WHERE article_id = $1",
            article_id
        )
        .fetch_all(self.db)
        .await?;

        Ok(ArticleRelations {
            production_ids,
            artist_ids,
            location_ids,
            event_ids,
        })
    }

    pub async fn set_relations(
        &self,
        article_id: Uuid,
        relations: ArticleRelations,
    ) -> Result<ArticleRelations, DatabaseError> {
        let mut tx = self.db.begin().await?;

        sqlx::query!(
            "DELETE FROM articles_about_productions WHERE article_id = $1",
            article_id
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "DELETE FROM articles_about_artists WHERE article_id = $1",
            article_id
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "DELETE FROM articles_about_locations WHERE article_id = $1",
            article_id
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "DELETE FROM articles_about_events WHERE article_id = $1",
            article_id
        )
        .execute(&mut *tx)
        .await?;

        for production_id in &relations.production_ids {
            sqlx::query!(
                "INSERT INTO articles_about_productions (article_id, production_id) VALUES ($1, $2)",
                article_id,
                production_id
            )
            .execute(&mut *tx)
            .await?;
        }

        for artist_id in &relations.artist_ids {
            sqlx::query!(
                "INSERT INTO articles_about_artists (article_id, artist_id) VALUES ($1, $2)",
                article_id,
                artist_id
            )
            .execute(&mut *tx)
            .await?;
        }

        for location_id in &relations.location_ids {
            sqlx::query!(
                "INSERT INTO articles_about_locations (article_id, location_id) VALUES ($1, $2)",
                article_id,
                location_id
            )
            .execute(&mut *tx)
            .await?;
        }

        for event_id in &relations.event_ids {
            sqlx::query!(
                "INSERT INTO articles_about_events (article_id, event_id) VALUES ($1, $2)",
                article_id,
                event_id
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(relations)
    }
}
