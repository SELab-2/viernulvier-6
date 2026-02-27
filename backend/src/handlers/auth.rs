use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use crate::{AppState, error::AppError};
use std::time::{SystemTime, UNIX_EPOCH};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use jsonwebtoken::{encode, EncodingKey, Header};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    email: String,
    exp: usize,
}

pub struct AuthHandler;

impl AuthHandler {
    pub async fn login(
        State(state): State<AppState>,
        Json(payload): Json<LoginRequest>,
    ) -> Result<Json<AuthResponse>, AppError> {
        tracing::info!("email: {}", payload.email);
        tracing::info!("password: {}", payload.password);

        // 1. Fetch user by email
        let user = state.db.users()
            .by_email(&payload.email)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        tracing::info!("password hash: {}", user.password_hash);


        // 2. Verify password
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AppError::Unauthorized)?;

        Argon2::default()
            .verify_password(payload.password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)?;

        // 3. Generate JWT
        let exp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize
            + 86400;

        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email,
            exp,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        )
        .map_err(|_| AppError::Internal("JWT encoding failed".to_string()))?;

        Ok(Json(AuthResponse { token }))
    }
}
