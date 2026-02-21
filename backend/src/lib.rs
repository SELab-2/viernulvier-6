use crate::{config::AppConfig, error::AppError, handlers::version::VersionHandler};
use axum::{Router, routing::get};
use database::Database;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::info;

pub mod config;
mod error;
mod extractors;
mod handlers;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: AppConfig,
}

pub async fn start_app(config: AppConfig) -> Result<(), AppError> {
    let db = Database::create_connect_migrate(&config.database_url).await?;

    let state = AppState { db, config };

    let app = Router::new()
        .merge(router())
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::very_permissive())
        .with_state(state);

    // start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    info!("Listening on http://{}/", listener.local_addr().unwrap());
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(open_routes())
        .fallback(get(|| async { AppError::NotFound }))
}

fn open_routes() -> Router<AppState> {
    Router::new().route("/version", get(VersionHandler::get))
}

#[allow(clippy::expect_used)]
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
