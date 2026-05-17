use axum::extract::Query;

use crate::{
    dto::{import_error::ImportErrorPayload, paginated::PaginatedResponse},
    error::ErrorResponse,
    handlers::{
        IntoApiResponse, JsonResponse,
        queries::{import_error::GetImportErrorsFilterQuery, pagination::PaginationQuery},
    },
};
use database::Database;

#[utoipa::path(
    method(get),
    path = "/import-errors",
    operation_id = "get_import_errors",
    tag = "Editor",
    description = "List importer errors for CMS usage. Returns unresolved errors by default.",
    params(PaginationQuery, GetImportErrorsFilterQuery),
    responses(
        (status = 200, description = "Success", body = PaginatedResponse<ImportErrorPayload>),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn get_all(
    db: Database,
    Query(pagination): Query<PaginationQuery>,
    Query(filter): Query<GetImportErrorsFilterQuery>,
) -> JsonResponse<PaginatedResponse<ImportErrorPayload>> {
    ImportErrorPayload::all(
        &db,
        pagination.cursor,
        pagination.limit as usize,
        filter.resolved,
    )
    .await?
    .json()
}
