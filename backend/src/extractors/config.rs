use axum::{
    extract::{FromRequestParts, State},
    http::request::Parts,
};

use crate::{AppState, config::AppConfig, error::AppError};

impl FromRequestParts<AppState> for AppConfig {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<AppConfig, Self::Rejection> {
        let State(app_state) = State::<AppState>::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Internal("Failed to extract app state".into()))?;
        Ok(app_state.config)
    }
}
