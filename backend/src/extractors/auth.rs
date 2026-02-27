use axum::{extract::FromRequestParts, http::request::Parts};
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::{AppState, error::AppError, handlers::auth::Claims};

pub struct AuthUser {
    pub user_id: String,
    pub email: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        // Extract the Authorization header
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        // Strip "Bearer "
        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized)?;

        // Decode and validate the JWT
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
            .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            email: token_data.claims.email,
        })
    }
}