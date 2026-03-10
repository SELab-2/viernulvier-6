use std::env;

use tracing::info;

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub api_key_404: String,
    pub jwt_secret: String,
    pub access_token_expiry_minutes: i8,
    pub refresh_token_expiry_days: i8,
}

impl AppConfig {
    pub fn load() -> Result<Self, AppError> {
        info!("loading config from ENV vars");
        Ok(Self {
            database_url: get_env_var("DATABASE_URL")?,
            api_key_404: get_env_var("API_KEY_404")?,
            jwt_secret: get_env_var("JWT_SECRET")?,
            access_token_expiry_minutes: 5,
            refresh_token_expiry_days: 7
        })
    }
}

fn get_env_var(name: &str) -> Result<String, AppError> {
    env::var(name).map_err(|_| AppError::Env(name.to_string()))
}
