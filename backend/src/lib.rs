use api::ApiImporter;
use axum::http::{HeaderValue, Method};
use axum::{Router, routing::get};
use database::Database;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info};

use utoipa::{
    Modify, OpenApi,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};

use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::AppConfig;
use crate::error::AppError;
use crate::handlers::{admin, auth, hall, location, production, space, version};

pub mod config;
pub mod dto;
mod error;
mod extractors;
mod handlers;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: AppConfig,
}

#[derive(OpenApi)]
#[openapi(
    modifiers(&SecurityAddon),
    tags(
        (name = "viernulvier_api", description = "API Endpoints")
    )
)]
pub struct ApiDoc;
struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            // Register Access Token (JWT)
            components.add_security_scheme(
                "cookie_auth", // Internal name for the scheme
                SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::new("access_token"))),
            );

            // Register Refresh Token
            components.add_security_scheme(
                "refresh_token",
                SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::new("refresh_token"))),
            );
        }
    }
}

pub async fn start_app(config: AppConfig) -> Result<(), AppError> {
    let db = Database::create_connect_migrate(&config.database_url).await?;

    // start api importer
    let api_importer = ApiImporter::new(db.clone(), config.api_key_404.clone());
    tokio::spawn(async move {
        match api_importer.update_since_last().await {
            Ok(()) => info!("API importer finished successfully"),
            Err(e) => error!("API imported ended with error: {e:?}"),
        }
    });

    let state = AppState { db, config };

    let allowed_origins: Vec<HeaderValue> = state
        .config
        .allowed_origins
        .iter()
        .map(|s| s.parse::<HeaderValue>().unwrap())
        .collect();

    let app = Router::new()
        .merge(router())
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(allowed_origins)
                .allow_methods([Method::GET, Method::POST])
                .allow_headers([axum::http::header::CONTENT_TYPE])
                .allow_credentials(true),
        )
        .with_state(state);

    // start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    info!("Listening on http://{}/", listener.local_addr().unwrap());
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

pub fn router() -> Router<AppState> {
    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(open_routes())
        .split_for_parts();

    router
        .merge(SwaggerUi::new("/docs").url("/api-doc/openapi.json", api))
        .fallback(get(|| async { AppError::NotFound }))
}

fn open_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        // version
        .routes(routes!(version::get))
        // locations
        .routes(routes!(location::get_all))
        .routes(routes!(location::get_one))
        .routes(routes!(location::post))
        .routes(routes!(location::delete))
        .routes(routes!(location::put))
        // productions
        .routes(routes!(production::get_all))
        .routes(routes!(production::get_one))
        .routes(routes!(production::post))
        .routes(routes!(production::delete))
        .routes(routes!(production::put))
        // auth
        .routes(routes!(auth::login))
        .routes(routes!(auth::refresh))
        .routes(routes!(auth::logout))
        .routes(routes!(admin::admin))
        .routes(routes!(admin::create_admin))
        // halls
        .routes(routes!(hall::get_all))
        .routes(routes!(hall::get_one))
        .routes(routes!(hall::post))
        .routes(routes!(hall::delete))
        .routes(routes!(hall::put))
        // spaces
        .routes(routes!(space::get_all))
        .routes(routes!(space::get_one))
        .routes(routes!(space::post))
        .routes(routes!(space::delete))
        .routes(routes!(space::put))
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
