use crate::{AppState, error::AppError, handlers::auth::Claims};
use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::CookieJar;
use jsonwebtoken::{DecodingKey, Validation, decode};
use uuid::Uuid;

use database::models::user::UserRole;

pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub session_id: Uuid,
    pub role: UserRole,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        let jar = <CookieJar as FromRequestParts<AppState>>::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        let token = jar
            .get("access_token")
            .map(|cookie: &axum_extra::extract::cookie::Cookie<'static>| cookie.value().to_string())
            .ok_or(AppError::Unauthorized)?;

        let token_data = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            id: token_data.claims.sub,
            email: token_data.claims.email,
            session_id: token_data.claims.sid,
            role: token_data.claims.role,
        })
    }
}

#[allow(dead_code)] // the Authuser isn't actually being used for now but the guard is.
pub struct RequireSuperAdmin(pub AuthUser);

impl FromRequestParts<AppState> for RequireSuperAdmin {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        // Use the existing AuthUser extractor to verify the user
        let user = AuthUser::from_request_parts(parts, state).await?;

        // Check for Superadmin
        if user.role != UserRole::Superadmin {
            return Err(AppError::Unauthorized);
        }

        Ok(RequireSuperAdmin(user))
    }
}

// Special implementation for Option<AuthUser> to allow optional auth (like in logout)
impl FromRequestParts<AppState> for Option<AuthUser> {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(auth) => Ok(Some(auth)),
            Err(_) => Ok(None),
        }
    }
}
