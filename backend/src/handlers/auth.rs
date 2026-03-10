use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::Json;
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use base64::Engine;
use chrono::Utc;
use jsonwebtoken::{EncodingKey, Header, encode};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use time::Duration;
use uuid::Uuid;

use crate::{config::AppConfig, error::AppError, error::ErrorResponse, extractors::auth::AuthUser};
use database::{Database, models::session::SessionCreate};
use utoipa::ToSchema;

const ACCESS_TOKEN_EXPIRY_MINUTES: i64 = 5;
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 7;

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct AuthResponse {
    pub message: String,
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub sid: Uuid,
    pub exp: u64,
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_access_token(
    user_id: Uuid,
    email: &str,
    session_id: Uuid,
    secret: &str,
) -> Result<String, AppError> {
    let exp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + (ACCESS_TOKEN_EXPIRY_MINUTES as u64 * 60);

    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        sid: session_id,
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal("JWT error".into()))
}

fn access_cookie(token: String) -> Cookie<'static> {
    Cookie::build(("access_token", token))
        //.http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(Duration::minutes(ACCESS_TOKEN_EXPIRY_MINUTES))
        .build()
}

fn refresh_cookie(token: String) -> Cookie<'static> {
    Cookie::build(("refresh_token", token))
        //.http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .path("/auth/refresh")
        .max_age(Duration::days(REFRESH_TOKEN_EXPIRY_DAYS))
        .build()
}

#[utoipa::path(
    method(post),
    path = "/auth/login",
    tag = "Auth",
    description = "Login to the API",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Success", body = AuthResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal Server Error", body = ErrorResponse)
    )
)]
pub async fn login(
    db: Database,
    config: AppConfig,
    jar: CookieJar,
    Json(payload): Json<LoginRequest>,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    let user = db
        .users()
        .by_email(&payload.email)
        .await
        .map_err(|_| AppError::Unauthorized)?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Internal("Failed to hash password.".to_string()))?;

    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    let mut random_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut random_bytes);
    let refresh_token = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

    let expiry_date = Utc::now() + chrono::Duration::days(REFRESH_TOKEN_EXPIRY_DAYS);
    let hashed_token = hash_token(&refresh_token);

    let session = db
        .sessions()
        .create(SessionCreate {
            user_id: user.id,
            token_hash: hashed_token,
            expires_at: expiry_date,
        })
        .await?;

    let access_token = generate_access_token(user.id, &user.email, session.id, &config.jwt_secret)?;

    let access_cookie = access_cookie(access_token);
    let refresh_cookie = refresh_cookie(refresh_token);

    let updated_jar = jar.add(access_cookie).add(refresh_cookie);
    Ok((
        updated_jar,
        Json(AuthResponse {
            message: "Logged in".into(),
            success: true,
        }),
    ))
}

#[utoipa::path(
    method(post),
    path = "/auth/refresh",
    tag = "Auth",
    description = "Refresh the access token using the refresh cookie",
    responses(
        (status = 200, description = "Success", body = AuthResponse),
        (status = 401, description = "Unauthorized - Invalid or expired refresh token", body = ErrorResponse)
    ),
    security(
        ("refresh_token" = [])
    )
)]
pub async fn refresh(
    jar: CookieJar,
    db: Database,
    config: AppConfig,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    let refresh_token = jar
        .get("refresh_token")
        .map(|cookie: &Cookie<'static>| cookie.value().to_string())
        .ok_or(AppError::Unauthorized)?;

    let hashed_token = hash_token(&refresh_token);

    let session = db
        .sessions()
        .by_token_hash(&hashed_token)
        .await
        .map_err(|_| AppError::Unauthorized)?;

    if session.expires_at < Utc::now() {
        return Err(AppError::Unauthorized);
    }

    let user = db
        .users()
        .by_id(session.user_id)
        .await
        .map_err(|_| AppError::Unauthorized)?;

    let new_access_token =
        generate_access_token(user.id, &user.email, session.id, &config.jwt_secret)?;

    let access_cookie = access_cookie(new_access_token);
    let updated_jar = jar.add(access_cookie);

    Ok((
        updated_jar,
        Json(AuthResponse {
            message: "Token refreshed".into(),
            success: true,
        }),
    ))
}

#[utoipa::path(
    method(post),
    path = "/auth/logout",
    tag = "Auth",
    description = "Logout and invalidate sessions",
    responses(
        (status = 200, description = "Logged out successfully", body = AuthResponse)
    ),
    security(
        ("cookie_auth" = []),
        ("refresh_token" = [])
    )
)]
pub async fn logout(
    auth: Option<AuthUser>,
    jar: CookieJar,
    db: Database,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    if let Some(user) = auth {
        let _ = db.sessions().delete(user.session_id).await;
    }

    if let Some(cookie) = jar.get("refresh_token") {
        let refresh_token = cookie.value();
        let hashed_token = hash_token(refresh_token);
        let _ = db.sessions().delete_by_token_hash(&hashed_token).await;
    }

    let access_cookie = Cookie::build(("access_token", ""))
        .path("/")
        .max_age(Duration::ZERO)
        .build();

    let refresh_cookie = Cookie::build(("refresh_token", ""))
        .path("/refresh")
        .max_age(Duration::ZERO)
        .build();

    let updated_jar = jar.add(access_cookie).add(refresh_cookie);
    Ok((
        updated_jar,
        Json(AuthResponse {
            message: "Logged out".into(),
            success: true,
        }),
    ))
}
