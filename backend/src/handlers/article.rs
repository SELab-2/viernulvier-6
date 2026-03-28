use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
};
use chrono::NaiveDate;
use database::Database;
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::{
    dto::article::{
        ArticleListPayload, ArticlePayload, ArticlePostPayload, ArticleRelationsPayload,
        ArticleUpdatePayload,
    },
    error::ErrorResponse,
    handlers::{IntoApiResponse, JsonResponse, JsonStatusResponse, StatusResponse},
};

#[derive(Debug, Deserialize, IntoParams)]
pub struct ArticleListParams {
    pub subject_start: Option<NaiveDate>,
    pub subject_end: Option<NaiveDate>,
    pub tag_slug: Option<String>,
    pub related_entity_id: Option<Uuid>,
    pub related_entity_type: Option<String>,
}

// ─── Public routes ────────────────────────────────────────────────────────────

#[utoipa::path(
    method(get),
    path = "/articles",
    tag = "Articles",
    operation_id = "get_all_articles",
    description = "Get published articles with optional filters",
    params(ArticleListParams),
    responses(
        (status = 200, description = "Success", body = [ArticleListPayload])
    )
)]
pub async fn get_all(
    db: Database,
    Query(params): Query<ArticleListParams>,
) -> JsonResponse<Vec<ArticleListPayload>> {
    ArticleListPayload::list_published(
        &db,
        params.subject_start,
        params.subject_end,
        params.tag_slug,
        params.related_entity_id,
        params.related_entity_type,
    )
    .await?
    .json()
}

#[utoipa::path(
    method(get),
    path = "/articles/{slug}",
    tag = "Articles",
    operation_id = "get_article_by_slug",
    description = "Get a published article by slug",
    params(
        ("slug" = String, Path, description = "Article slug")
    ),
    responses(
        (status = 200, description = "Success", body = ArticlePayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(slug): Path<String>) -> JsonResponse<ArticlePayload> {
    ArticlePayload::by_slug(&db, &slug).await?.json()
}

// ─── CMS/editor routes ────────────────────────────────────────────────────────

#[utoipa::path(
    method(get),
    path = "/articles/cms",
    tag = "Articles",
    operation_id = "get_all_articles_cms",
    description = "Get all articles (all statuses) — editor only",
    responses(
        (status = 200, description = "Success", body = [ArticleListPayload]),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn get_all_cms(db: Database) -> JsonResponse<Vec<ArticleListPayload>> {
    ArticleListPayload::all_cms(&db).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/articles/cms/{id}",
    tag = "Articles",
    operation_id = "get_article_by_id_cms",
    description = "Get a single article by UUID — editor only",
    params(
        ("id" = Uuid, Path, description = "Article UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArticlePayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn get_one_cms(db: Database, Path(id): Path<Uuid>) -> JsonResponse<ArticlePayload> {
    ArticlePayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(post),
    path = "/articles",
    tag = "Articles",
    operation_id = "create_article",
    description = "Create a new draft article",
    responses(
        (status = 201, description = "Created", body = ArticlePayload),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn post(
    db: Database,
    Json(article): Json<ArticlePostPayload>,
) -> JsonStatusResponse<ArticlePayload> {
    article.create(&db).await?.json_created()
}

#[utoipa::path(
    method(put),
    path = "/articles/{id}",
    tag = "Articles",
    operation_id = "update_article",
    description = "Update an article",
    params(
        ("id" = Uuid, Path, description = "Article UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArticlePayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn put(
    db: Database,
    Path(id): Path<Uuid>,
    Json(article): Json<ArticleUpdatePayload>,
) -> JsonResponse<ArticlePayload> {
    article.update(&db, id).await?.json()
}

#[utoipa::path(
    method(delete),
    path = "/articles/cms/{id}",
    tag = "Articles",
    operation_id = "delete_article",
    description = "Delete an article",
    params(
        ("id" = Uuid, Path, description = "Article UUID")
    ),
    responses(
        (status = 204, description = "No Content"),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn delete(db: Database, Path(id): Path<Uuid>) -> StatusResponse {
    ArticlePayload::delete(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    method(get),
    path = "/articles/cms/{id}/relations",
    tag = "Articles",
    operation_id = "get_article_relations",
    description = "Get related entities for an article — editor only",
    params(
        ("id" = Uuid, Path, description = "Article UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArticleRelationsPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn get_relations(
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<ArticleRelationsPayload> {
    ArticleRelationsPayload::get(&db, id).await?.json()
}

#[utoipa::path(
    method(put),
    path = "/articles/cms/{id}/relations",
    tag = "Articles",
    operation_id = "update_article_relations",
    description = "Replace all related entities for an article — editor only",
    params(
        ("id" = Uuid, Path, description = "Article UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArticleRelationsPayload),
        (status = 404, description = "Not found"),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(("cookie_auth" = []))
)]
pub async fn put_relations(
    db: Database,
    Path(id): Path<Uuid>,
    Json(relations): Json<ArticleRelationsPayload>,
) -> JsonResponse<ArticleRelationsPayload> {
    relations.set(&db, id).await?.json()
}
