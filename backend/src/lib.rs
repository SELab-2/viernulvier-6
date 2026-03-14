use api::ApiImporter;
use axum::http::{HeaderValue, Method};
use axum::{Router, routing::get};
use axum::middleware::from_extractor_with_state;
use database::Database;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info};
use crate::extractors::auth::{EditorUser, AdminUser};

use utoipa::{
    Modify, OpenApi,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    openapi::Server,
};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::AppConfig;
use crate::error::AppError;
use crate::handlers::{admin, auth, hall, location, production, space, taxonomy, version};

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

struct PathPrefixAddon {
    pub preview_name: String,
}

impl Modify for PathPrefixAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let mut base_path = if self.preview_name.is_empty() {
            "/api".to_string()
        } else {
            format!("/{}/api", self.preview_name)
        };

        base_path = base_path.replace("//", "/");
        if !base_path.starts_with('/') {
            base_path = format!("/{}", base_path);
        }

        openapi.servers = Some(vec![Server::new(base_path)]);
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
        .merge(router(state.clone()))
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

pub fn router(state: AppState) -> Router<AppState> {
    let mut openapi = ApiDoc::openapi();

    let base_path = if state.config.preview_name.is_empty() {
        "/api".to_string()
    } else {
        format!("/{}/api", state.config.preview_name).replace("//", "/")
    };

    let modifier = PathPrefixAddon {
        preview_name: state.config.preview_name.clone(),
    };
    modifier.modify(&mut openapi);

    let (api_router, api_spec) = OpenApiRouter::with_openapi(openapi)
        .merge(public_routes())
        .merge(editor_routes(state.clone()))
        .merge(admin_routes(state.clone()))
        .split_for_parts();

    let docs_path = format!("{}/docs", base_path);
    let openapi_json_path = format!("{}/openapi.json", base_path);

    let swagger_ui = SwaggerUi::new(docs_path)
        .url(openapi_json_path, api_spec);

    Router::new()
        .nest(&base_path, api_router)
        .merge(swagger_ui)
        .fallback(get(|| async { AppError::NotFound }))
}

// No security needed
fn public_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        // version
        .routes(routes!(version::get))
        // auth
        .routes(routes!(auth::login))
        .routes(routes!(auth::refresh))
        .routes(routes!(auth::logout))
        // location
        .routes(routes!(location::get_all))
        .routes(routes!(location::get_one))
        // production
        .routes(routes!(production::get_all))
        .routes(routes!(production::get_one))
        // hall
        .routes(routes!(hall::get_all))
        .routes(routes!(hall::get_one))
        // space
        .routes(routes!(space::get_all))
        .routes(routes!(space::get_one))
}

// Only editors can edit data
fn editor_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        // Editor/Admin
        .routes(routes!(admin::editor_me))
        // Location
        .routes(routes!(location::post))
        .routes(routes!(location::delete))
        .routes(routes!(location::put))
        // Production
        .routes(routes!(production::post))
        .routes(routes!(production::delete))
        .routes(routes!(production::put))
        // Hall
        .routes(routes!(hall::post))
        .routes(routes!(hall::delete))
        .routes(routes!(hall::put))
        // Space
        .routes(routes!(space::post))
        .routes(routes!(space::delete))
        .routes(routes!(space::put))

        // taxonomies
        .routes(routes!(taxonomy::get_facets))

        .layer(from_extractor_with_state::<EditorUser, AppState>(state))
}

fn admin_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(admin::create_editor))
        .layer(from_extractor_with_state::<AdminUser, AppState>(state))
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
