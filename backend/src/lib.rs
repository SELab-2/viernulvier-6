use crate::extractors::auth::{AdminUser, EditorUser};
use api::ApiImporter;
use aws_sdk_s3::config::{Builder as S3Builder, Credentials, Region};
use axum::http::{HeaderValue, Method};
use axum::middleware::from_extractor_with_state;
use axum::{Router, routing::get};
use database::Database;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info};

use utoipa::{
    Modify, OpenApi,
    openapi::Server,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::AppConfig;
use crate::error::AppError;
use crate::handlers::{admin, auth, event, hall, location, media, production, space, taxonomy, version};

pub mod config;
pub mod dto;
mod error;
mod extractors;
mod handlers;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: AppConfig,
    pub s3_client: Option<aws_sdk_s3::Client>,
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

    // initialize S3 client if config is present
    let s3_client = if let Some(ref s3_config) = config.s3 {
        info!("initializing S3 client for {}", s3_config.endpoint);
        let creds = Credentials::new(
            &s3_config.access_key,
            &s3_config.secret_key,
            None,
            None,
            "garage",
        );

        let s3_conf = S3Builder::new()
            .region(Region::new(s3_config.region.clone()))
            .endpoint_url(&s3_config.endpoint)
            .credentials_provider(creds)
            .force_path_style(true)
            .build();

        Some(aws_sdk_s3::Client::from_conf(s3_conf))
    } else {
        None
    };

    // start api importer (with S3 access for media import)
    let importer_s3_client = s3_client.clone();
    let importer_s3_bucket = config.s3.as_ref().map(|s| s.bucket.clone());
    let api_importer = ApiImporter::new(
        db.clone(),
        config.api_key_404.clone(),
        importer_s3_client,
        importer_s3_bucket,
    );
    tokio::spawn(async move {
        match api_importer.update_since_last().await {
            Ok(()) => info!("API importer finished successfully"),
            Err(e) => error!("API imported ended with error: {e:?}"),
        }
    });

    let state = AppState { db, config, s3_client };

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
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
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

    let swagger_ui = SwaggerUi::new(docs_path).url(openapi_json_path, api_spec);

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
        .routes(routes!(production::get_events))
        // hall
        .routes(routes!(hall::get_all))
        .routes(routes!(hall::get_one))
        // space
        .routes(routes!(space::get_all))
        .routes(routes!(space::get_one))
        // event
        .routes(routes!(event::get_all))
        .routes(routes!(event::get_one))
        // taxonomies
        .routes(routes!(taxonomy::get_facets))
        // media
        .routes(routes!(media::get_all))
        .routes(routes!(media::get_one))
        .routes(routes!(media::get_entity_media))
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
        // Event
        .routes(routes!(event::post))
        .routes(routes!(event::delete))
        .routes(routes!(event::put))
        // Media
        .routes(routes!(media::generate_upload_url))
        .routes(routes!(media::put))
        .routes(routes!(media::delete))
        .routes(routes!(media::attach_to_entity))
        .routes(routes!(media::unlink_from_entity))
        .routes(routes!(media::cleanup_orphans))
        .routes(routes!(media::reconcile_storage))
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
