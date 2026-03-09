use axum::{Json};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use base64::Engine;
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::RngCore;
use sha2::{Sha256, Digest};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::{config::AppConfig, error::AppError, extractors::auth::AuthUser};
use database::{Database, models::session::SessionCreate};

const ACCESS_TOKEN_EXPIRY_MINUTES: i64 = 15;
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 7;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub sid: Uuid,
    pub exp: u64,
}

pub struct AuthHandler;

impl AuthHandler {
    fn hash_token(token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        hex::encode(hasher.finalize())
    }

    fn generate_access_token(user_id: Uuid, email: &str, session_id: Uuid, secret: &str) -> Result<String, AppError> {
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
            .http_only(true)
            .secure(true)
            .same_site(SameSite::Strict)
            .path("/")
            .max_age(Duration::minutes(ACCESS_TOKEN_EXPIRY_MINUTES))
            .build()
    }

    fn refresh_cookie(token: String) -> Cookie<'static> {
        Cookie::build(("refresh_token", token))
            .http_only(true)
            .secure(true)
            .same_site(SameSite::Strict)
            .path("/refresh")
            .max_age(Duration::days(REFRESH_TOKEN_EXPIRY_DAYS))
            .build()
    }

    pub async fn login(
        db: Database,
        config: AppConfig,
        jar: CookieJar,
        Json(payload): Json<LoginRequest>,
    ) -> Result<(CookieJar, Json<AuthResponse>), AppError> {

        // 1. Fetch user & verify password
        let user = db.users()
            .by_email(&payload.email)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AppError::Internal("Failed to hash password.".to_string()))?;

        Argon2::default()
            .verify_password(payload.password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)?;

        // 2. Generate Opaque Refresh Token (Need this first to save in DB)
        let mut random_bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut random_bytes);
        let refresh_token = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

        // 3. Save Refresh Token to Database & Get Session ID
        let expiry_date = OffsetDateTime::now_utc() + Duration::days(REFRESH_TOKEN_EXPIRY_DAYS);
        let hashed_token = Self::hash_token(&refresh_token);

        let session = db.sessions().create(SessionCreate {
            user_id: user.id,
            token_hash: hashed_token,
            expires_at: expiry_date,
        }).await?;

        // 4. Generate short-lived Access Token (JWT) linked to session_id
        let access_token = Self::generate_access_token(user.id, &user.email, session.id, &config.jwt_secret)?;

        // 5. Build HttpOnly Cookies
        let access_cookie = Self::access_cookie(access_token);
        let refresh_cookie = Self::refresh_cookie(refresh_token);

        // 6. Return cookies in the jar
        let updated_jar = jar.add(access_cookie).add(refresh_cookie);
        Ok((updated_jar, Json(AuthResponse { message: "Success".into() })))
    }

    pub async fn refresh(
        jar: CookieJar,
        db: Database,
        config: AppConfig,
    ) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
        // 1. Extract the refresh token from the cookie
        let refresh_token = jar.get("refresh_token")
            .map(|cookie| cookie.value().to_string())
            .ok_or(AppError::Unauthorized)?;

        // 2. Validate against Database
        let hashed_token = Self::hash_token(&refresh_token);

        // Map the database error (specifically NotFound) to an Unauthorized error
        let session = db.sessions()
            .by_token_hash(&hashed_token)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        if session.expires_at < OffsetDateTime::now_utc() {
            return Err(AppError::Unauthorized);
        }

        let user = db.users().by_id(session.user_id).await.map_err(|_| AppError::Unauthorized)?;

        // 3. Generate a NEW short-lived Access Token (linked to SAME session_id)
        let new_access_token = Self::generate_access_token(user.id, &user.email, session.id, &config.jwt_secret)?;

        // 4. Update the access cookie
        let access_cookie = Self::access_cookie(new_access_token);
        let updated_jar = jar.add(access_cookie);

        Ok((updated_jar, Json(AuthResponse { message: "Token refreshed".into() })))
    }

    pub async fn logout(
        auth: Option<AuthUser>, // Extract sid from JWT if valid
        jar: CookieJar,
        db: Database,
    ) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
        // 1. If we have a valid JWT, invalidate the session by ID
        if let Some(user) = auth {
            let _ = db.sessions().delete(user.session_id).await;
        }

        // 2. If refresh token exists in cookie, try to delete it by hash too
        // This handles cases where the access token is invalid/missing
        if let Some(cookie) = jar.get("refresh_token") {
            let refresh_token = cookie.value();
            let hashed_token = Self::hash_token(refresh_token);
            let _ = db.sessions().delete_by_token_hash(&hashed_token).await;
        }

        // 3. Clear cookies regardless of deletion success
        let access_cookie = Cookie::build(("access_token", ""))
            .path("/")
            .max_age(Duration::ZERO)
            .build();

        let refresh_cookie = Cookie::build(("refresh_token", ""))
            .path("/refresh")
            .max_age(Duration::ZERO)
            .build();

        let updated_jar = jar.add(access_cookie).add(refresh_cookie);
        Ok((updated_jar, Json(AuthResponse { message: "Logged out".into() })))
    }
}
