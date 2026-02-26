use axum::Json;
use database::Database;

use crate::{dto::production::ProductionPayload, error::AppError};

pub struct ProductionHandler;

impl ProductionHandler {
    pub async fn all(db: Database) -> Result<Json<Vec<ProductionPayload>>, AppError> {
        Ok(Json(ProductionPayload::all(&db, 10).await?))
    }
}
