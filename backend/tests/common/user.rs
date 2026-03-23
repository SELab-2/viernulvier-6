use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use chrono::Utc;
use database::{Database, models::{user::{User, UserCreate, UserRole}, session::SessionCreate}};
use jsonwebtoken::{Header, EncodingKey, encode};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use viernulvier_api::config::AppConfig;

#[derive(Debug, Serialize)]
struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub sid: Uuid,
    pub role: UserRole,
    pub exp: u64,
}

pub async fn create_test_user(db: &Database, email: &str, role: UserRole) -> User {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password("password123".as_bytes(), &salt)
        .unwrap()
        .to_string();

    db.users()
        .create(UserCreate {
            username: email.split('@').next().unwrap().to_string(),
            email: email.to_string(),
            password_hash,
            role,
        })
        .await
        .unwrap()
}

pub async fn login_user(db: &Database, config: &AppConfig, user: &User) -> String {
    let session = db.sessions().create(SessionCreate {
        user_id: user.id,
        token_hash: "test_hash".to_string(),
        expires_at: Utc::now() + chrono::Duration::days(1),
    }).await.unwrap();

    let exp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + (config.access_token_expiry_minutes as u64 * 60);

    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        sid: session.id,
        role: user.role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    ).unwrap();

    format!("access_token={}", token)
}
