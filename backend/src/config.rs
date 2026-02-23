use std::env;

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub api_key_404: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, AppError> {
        Ok(Self {
            database_url: get_env_var("DATABASE_URL")?,
            api_key_404: get_env_var("API_KEY_404")?,
        })
    }
}

fn get_env_var(name: &str) -> Result<String, AppError> {
    env::var(name).map_err(|_| AppError::Env(name.to_string()))
}
