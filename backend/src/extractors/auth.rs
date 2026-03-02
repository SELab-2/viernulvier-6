use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::{AppState, error::AppError, handlers::auth::Claims};

pub struct AuthUser {
    pub user_id: String,
    pub email: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, state)
                .await
                .map_err(|_| AppError::Unauthorized)?;

        let token_data = decode::<Claims>(
            bearer.token(),
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