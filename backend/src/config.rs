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
    pub cookie_secure: bool,
    pub cookie_same_site: String,
    pub s3: Option<S3Config>,
    pub admin_email: String,
    pub admin_password: Option<String>,
    pub upload_secret: String,
    pub max_upload_size_bytes: i64,
}

#[derive(Debug, Clone)]
pub struct S3Config {
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
    pub bucket: String,
    pub public_url: String,
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

        let admin_password = env::var("ADMIN_PASSWORD").ok();
        if admin_password.is_none() {
            warn!("ADMIN_PASSWORD not set, bootstrap admin will not be created");
        }
        let admin_email =
            env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@viernulvier.be".to_string());

        let s3 = match (
            env::var("S3_ENDPOINT"),
            env::var("S3_ACCESS_KEY"),
            env::var("S3_SECRET_KEY"),
            env::var("S3_BUCKET"),
        ) {
            (Ok(endpoint), Ok(access_key), Ok(secret_key), Ok(bucket)) => {
                info!("S3 config loaded");
                Some(S3Config {
                    endpoint,
                    region: env::var("S3_REGION").unwrap_or_else(|_| "garage".to_string()),
                    access_key,
                    secret_key,
                    bucket,
                    public_url: env::var("S3_PUBLIC_URL")
                        .unwrap_or_else(|_| "http://localhost:3900".to_string()),
                })
            }
            (endpoint, access_key, secret_key, bucket) => {
                let mut missing = Vec::new();
                if endpoint.is_err() {
                    missing.push("S3_ENDPOINT");
                }
                if access_key.is_err() {
                    missing.push("S3_ACCESS_KEY");
                }
                if secret_key.is_err() {
                    missing.push("S3_SECRET_KEY");
                }
                if bucket.is_err() {
                    missing.push("S3_BUCKET");
                }
                info!("S3 config not fully set. Missing variables: {:?}", missing);
                None
            }
        };

        Ok(Self {
            database_url: get_env_var("DATABASE_URL")?,
            api_key_404,
            jwt_secret: get_env_var("JWT_SECRET")?,
            access_token_expiry_minutes: 5,
            refresh_token_expiry_days: 7,
            allowed_origins,
            preview_name: env::var("PREVIEW_NAME").unwrap_or_default(),
            cookie_secure: env::var("COOKIE_SECURE")
                .map(|v| v == "true")
                .unwrap_or(true),
            cookie_same_site: env::var("COOKIE_SAME_SITE").unwrap_or_else(|_| "strict".to_string()),
            s3,
            admin_email,
            admin_password,
            upload_secret: env::var("UPLOAD_SECRET")
                .unwrap_or_else(|_| get_env_var("JWT_SECRET").unwrap_or_default()),
            max_upload_size_bytes: env::var("MAX_UPLOAD_SIZE_MIB")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(50)
                * 1024
                * 1024,
        })
    }
}

fn get_env_var(name: &str) -> Result<String, AppError> {
    env::var(name).map_err(|_| AppError::Env(name.to_string()))
}
