use rust_backend_template::{config::AppConfig, start_app};
use std::error::Error;
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let _ = dotenvy::dotenv();
    let config = AppConfig::load()?;

    // setup logging
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_env("LOG_LEVEL"))
        .init();

    start_app(config).await?;

    Ok(())
}
