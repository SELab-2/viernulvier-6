use std::env;

use tracing::{info, warn};

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub api_key_404: Option<String>,
    pub jwt_secret: String,
    pub access_token_expiry_minutes: i8,
    pub refresh_token_expiry_days: i8,
    pub allowed_origins: Vec<String>,
    pub preview_name: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, AppError> {
        info!("loading config from ENV vars");
        let allowed_origins = get_env_var("ALLOWED_ORIGINS")?
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let api_key_404 = env::var("API_KEY_404").ok();
        if api_key_404.is_none() {
            warn!("API_KEY_404 not set, API importer will be disabled");
        }

        Ok(Self {
            database_url: get_env_var("DATABASE_URL")?,
            api_key_404,
            jwt_secret: get_env_var("JWT_SECRET")?,
            access_token_expiry_minutes: 5,
            refresh_token_expiry_days: 7,
            allowed_origins,
            preview_name: env::var("PREVIEW_NAME").unwrap_or_default(),
        })
    }
}

fn get_env_var(name: &str) -> Result<String, AppError> {
    env::var(name).map_err(|_| AppError::Env(name.to_string()))
}
