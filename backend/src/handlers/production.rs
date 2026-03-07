use axum::Json;
use database::Database;

use crate::{dto::production::ProductionPayload, error::AppError};


#[utoipa::path(
    method(get),
    path = "/productions",
    tag = "Productions",
    description = "Get all productions",
    responses(
        (status = 200, description = "Success", body = [ProductionPayload])
    )
)]
pub async fn all(db: Database) -> Result<Json<Vec<ProductionPayload>>, AppError> {
    Ok(Json(ProductionPayload::all(&db, 10).await?))
}