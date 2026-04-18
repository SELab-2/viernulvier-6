use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::Json;
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use base64::Engine;
use chrono::Utc;
use jsonwebtoken::{EncodingKey, Header, encode};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use time::Duration;
use uuid::Uuid;

use crate::{config::AppConfig, error::AppError, error::ErrorResponse, extractors::auth::AuthUser};
use database::{Database, models::session::SessionCreate, models::user::UserRole};
use utoipa::ToSchema;

const ACCESS_TOKEN_COOKIE: &str = "access_token";
const REFRESH_TOKEN_COOKIE: &str = "refresh_token";
const SESSION_PRESENT_COOKIE: &str = "session_present";

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
    pub role: UserRole,
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
    role: UserRole,
    secret: &str,
    expiry_minutes: i8,
) -> Result<String, AppError> {
    let exp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + (expiry_minutes as u64 * 60);

    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        sid: session_id,
        role,
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal("JWT error".into()))
}

fn parse_same_site(value: &str) -> SameSite {
    match value.to_lowercase().as_str() {
        "lax" => SameSite::Lax,
        "none" => SameSite::None,
        _ => SameSite::Strict,
    }
}

fn access_cookie(
    token: String,
    expiry_minutes: i8,
    secure: bool,
    same_site: SameSite,
) -> Cookie<'static> {
    Cookie::build((ACCESS_TOKEN_COOKIE, token))
        .http_only(true)
        .secure(secure)
        .same_site(same_site)
        .path("/")
        .max_age(Duration::minutes(expiry_minutes.into()))
        .build()
}

fn refresh_cookie(
    token: String,
    expiry_days: i8,
    secure: bool,
    same_site: SameSite,
    preview_name: &str,
) -> Cookie<'static> {
    let path = if preview_name.is_empty() {
        "/api/auth/refresh".to_string()
    } else {
        format!("/{preview_name}/api/auth/refresh")
    };
    Cookie::build((REFRESH_TOKEN_COOKIE, token))
        .http_only(true)
        .secure(secure)
        .same_site(same_site)
        .path(path)
        .max_age(Duration::days(expiry_days.into()))
        .build()
}

fn session_present_cookie(expiry_days: i8, secure: bool, same_site: SameSite) -> Cookie<'static> {
    Cookie::build((SESSION_PRESENT_COOKIE, "true"))
        .secure(secure)
        .same_site(same_site)
        .path("/")
        .max_age(Duration::days(expiry_days.into()))
        .build()
}

#[utoipa::path(
    method(post),
    path = "/auth/login",
    tag = "Auth",
    operation_id = "auth_login",
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
    rand::rng().fill_bytes(&mut random_bytes);
    let refresh_token = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

    let expiry_date = Utc::now() + chrono::Duration::days(config.refresh_token_expiry_days.into());
    let hashed_token = hash_token(&refresh_token);

    let session = db
        .sessions()
        .create(SessionCreate {
            user_id: user.id,
            token_hash: hashed_token,
            expires_at: expiry_date,
        })
        .await?;

    let access_token = generate_access_token(
        user.id,
        &user.email,
        session.id,
        user.role.clone(),
        &config.jwt_secret,
        config.access_token_expiry_minutes,
    )?;

    let same_site = parse_same_site(&config.cookie_same_site);
    let access_cookie = access_cookie(
        access_token,
        config.access_token_expiry_minutes,
        config.cookie_secure,
        same_site,
    );
    let refresh_cookie = refresh_cookie(
        refresh_token,
        config.refresh_token_expiry_days,
        config.cookie_secure,
        same_site,
        &config.preview_name,
    );
    let session_present = session_present_cookie(
        config.refresh_token_expiry_days,
        config.cookie_secure,
        same_site,
    );

    let updated_jar = jar
        .add(access_cookie)
        .add(refresh_cookie)
        .add(session_present);
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
    operation_id = "refresh_access_token",
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

    let new_access_token = generate_access_token(
        user.id,
        &user.email,
        session.id,
        user.role.clone(),
        &config.jwt_secret,
        config.access_token_expiry_minutes,
    )?;

    let same_site = parse_same_site(&config.cookie_same_site);
    let access_cookie = access_cookie(
        new_access_token,
        config.access_token_expiry_minutes,
        config.cookie_secure,
        same_site,
    );
    // Note: refresh endpoint only sets a new access token; refresh cookie path is kept intact.
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
    operation_id = "logout_and_invalidate_sessions",
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
    config: AppConfig,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    if let Some(user) = auth {
        let _ = db.sessions().delete(user.session_id).await;
    }

    if let Some(cookie) = jar.get("refresh_token") {
        let refresh_token = cookie.value();
        let hashed_token = hash_token(refresh_token);
        let _ = db.sessions().delete_by_token_hash(&hashed_token).await;
    }

    let same_site = parse_same_site(&config.cookie_same_site);
    let refresh_path = if config.preview_name.is_empty() {
        "/api/auth/refresh".to_string()
    } else {
        format!("/{}/api/auth/refresh", config.preview_name)
    };
    let access_cookie = Cookie::build(("access_token", ""))
        .secure(config.cookie_secure)
        .same_site(same_site)
        .path("/")
        .max_age(Duration::ZERO)
        .build();

    let refresh_cookie = Cookie::build(("refresh_token", ""))
        .secure(config.cookie_secure)
        .same_site(same_site)
        .path(refresh_path)
        .max_age(Duration::ZERO)
        .build();

    let session_present = Cookie::build((SESSION_PRESENT_COOKIE, ""))
        .secure(config.cookie_secure)
        .same_site(same_site)
        .path("/")
        .max_age(Duration::ZERO)
        .build();

    let updated_jar = jar
        .add(access_cookie)
        .add(refresh_cookie)
        .add(session_present);
    Ok((
        updated_jar,
        Json(AuthResponse {
            message: "Logged out".into(),
            success: true,
        }),
    ))
}
