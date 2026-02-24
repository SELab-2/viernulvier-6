use std::env;

use tracing::info;

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, AppError> {
        info!("loading config from ENV vars");
        Ok(Self {
            database_url: get_env_var("DATABASE_URL")?,
        })
    }
}

fn get_env_var(name: &str) -> Result<String, AppError> {
    env::var(name).map_err(|_| AppError::Env(name.to_string()))
}
