use axum::{Json};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use jsonwebtoken::{encode, EncodingKey, Header};

use crate::{config::AppConfig, error::AppError};
use database::Database;


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
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub exp: u64,
}

pub struct AuthHandler;

impl AuthHandler {
    pub async fn login(
        db: Database,
        config: AppConfig,
        Json(payload): Json<LoginRequest>,
    ) -> Result<Json<AuthResponse>, AppError> {

        // 1. Fetch user by email
        let user = db.users()
            .by_email(&payload.email)
            .await
            .map_err(|_| AppError::Unauthorized)?;


        // 2. Verify password
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AppError::Internal("Failed to hash password.".to_string()))?;

        Argon2::default()
            .verify_password(payload.password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)?;

        // 3. Generate JWT
        let exp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            + 86400;

        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email,
            exp,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
        )
        .map_err(|_| AppError::Internal("JWT encoding failed".to_string()))?;

        Ok(Json(AuthResponse { token }))
    }
}
