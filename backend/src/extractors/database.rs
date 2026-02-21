use axum::{
    extract::{FromRequestParts, State},
    http::request::Parts,
};
use database::Database;

use crate::{AppState, error::AppError};

impl FromRequestParts<AppState> for Database {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Database, Self::Rejection> {
        let State(app_state) = State::<AppState>::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Internal("Failed to extract app state".into()))?;

        Ok(app_state.db)
    }
}
