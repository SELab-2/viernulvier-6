use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use crate::extractors::auth::{AdminUser, EditorUser};
use api::ApiImporter;
use aws_sdk_s3::config::{Builder as S3Builder, Credentials, Region};
use axum::http::{HeaderValue, Method};
use axum::middleware::from_extractor_with_state;
use axum::{Router, routing::get};
use database::Database;
use database::models::entity_type::EntityType;
use database::models::user::{UserCreate, UserRole};
use database::models::facet::Facet;
use handlers::queries::sort::Sort;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info, warn};

use utoipa::{
    Modify, OpenApi,
    openapi::Server,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::{Config, SwaggerUi};

use crate::config::AppConfig;
use crate::error::AppError;
use crate::handlers::{
    admin, article, artist, auth, collection, event, hall, import_error, location, media,
    production, series, space, stats, tagging, taxonomy, version,
};

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
    components(schemas(EntityType, Facet, Sort)),
    tags(
        (name = "Collections", description = "A saved, titled selection of archive items with a shareable URL. No login required to view."),
        (name = "Series", description = "Thematic/programmatic groupings of productions."),
        (name = "Stats", description = "Aggregate public site statistics.")
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
            base_path = format!("/{base_path}");
        }

        openapi.servers = Some(vec![Server::new(base_path)]);
    }
}

pub async fn start_app(config: AppConfig) -> Result<(), AppError> {
    let db = Database::create_connect_migrate(&config.database_url).await?;

    let has_admin = db.users().has_admin().await?;
    if has_admin {
        info!("Admin user already exists, skipping bootstrap");
    } else {
        let Some(password) = &config.admin_password else {
            warn!("ADMIN_PASSWORD is required because no admin user exists yet");
            return Err(AppError::Internal(
                "ADMIN_PASSWORD is required because no admin user exists yet".into(),
            ));
        };
        info!("No admin user found, bootstrapping admin account");
        bootstrap_admin_if_missing(&db, &config.admin_email, password).await?;
    }

    // initialize S3 client if config is present
    let s3_client = config.s3.as_ref().map(|s3_config| {
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

        aws_sdk_s3::Client::from_conf(s3_conf)
    });

    if s3_client.is_none() {
        info!("S3 config not set, media upload disabled");
    }

    // start api importer only if api_key_404 is configured
    if let Some(api_key) = &config.api_key_404 {
        let importer_s3_client = s3_client.clone();
        let importer_s3_bucket = config.s3.as_ref().map(|s| s.bucket.clone());

        let api_importer = ApiImporter::new(
            db.clone(),
            api_key.clone(),
            importer_s3_client,
            importer_s3_bucket,
        );

        tokio::spawn(async move {
            match api_importer.update_since_last().await {
                Ok(()) => info!("API importer finished successfully"),
                Err(e) => error!("API imported ended with error: {e:?}"),
            }
        });
    } else {
        warn!("API importer is disabled");
    }

    let state = AppState {
        db,
        config,
        s3_client,
    };

    let allowed_origins: Vec<HeaderValue> = state
        .config
        .allowed_origins
        .iter()
        .map(|s| s.parse::<HeaderValue>().unwrap())
        .collect();

    let app = Router::new()
        .merge(router(&state))
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

pub fn router(state: &AppState) -> Router<AppState> {
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

    let docs_path = format!("{base_path}/docs");
    let openapi_json_path = format!("{base_path}/openapi.json");

    let swagger_ui = SwaggerUi::new(docs_path)
        .url(openapi_json_path, api_spec)
        .config(Config::default().doc_expansion("none"));

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
        // stats
        .routes(routes!(stats::get))
        // auth
        .routes(routes!(auth::login))
        .routes(routes!(auth::refresh))
        .routes(routes!(auth::logout))
        // location
        .routes(routes!(location::get_all))
        .routes(routes!(location::get_one))
        .routes(routes!(location::get_one_by_slug))
        // production
        .routes(routes!(production::get_all))
        .routes(routes!(production::get_one))
        .routes(routes!(production::get_one_by_slug))
        .routes(routes!(production::get_events))
        // hall
        .routes(routes!(hall::get_all))
        .routes(routes!(hall::get_one))
        .routes(routes!(hall::get_one_by_slug))
        // space
        .routes(routes!(space::get_all))
        .routes(routes!(space::get_one))
        // event
        .routes(routes!(event::get_all))
        .routes(routes!(event::get_one))
        // taxonomies
        .routes(routes!(taxonomy::get_facets))
        // entity tags
        .routes(routes!(tagging::get_tags))
        // media
        .routes(routes!(media::get_all))
        .routes(routes!(media::get_one))
        .routes(routes!(media::get_entity_media))
        // collections
        .routes(routes!(collection::get_all))
        .routes(routes!(collection::get_one))
        .routes(routes!(collection::get_one_by_slug))
        // series
        .routes(routes!(series::get_all))
        .routes(routes!(series::get_one))
        .routes(routes!(series::get_for_production))
        // artists
        .routes(routes!(artist::get_all))
        .routes(routes!(artist::get_one))
        .routes(routes!(artist::get_productions))
        // articles (public: published only, filterable)
        .routes(routes!(article::get_all))
        .routes(routes!(article::get_one))
}

// Only editors can edit data
fn editor_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        // Editor/Admin
        .routes(routes!(admin::editor_me))
        .routes(routes!(import_error::get_all))
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
        // Collection
        .routes(routes!(collection::post))
        .routes(routes!(collection::put))
        .routes(routes!(collection::delete))
        .routes(routes!(collection::post_item))
        .routes(routes!(collection::put_items))
        .routes(routes!(collection::delete_item))
        // Series
        .routes(routes!(series::post))
        .routes(routes!(series::put))
        .routes(routes!(series::delete))
        .routes(routes!(series::add_productions))
        .routes(routes!(series::remove_production))
        // Media
        .routes(routes!(media::generate_upload_url))
        .routes(routes!(media::put))
        .routes(routes!(media::delete))
        .routes(routes!(media::attach_to_entity))
        .routes(routes!(media::link_to_entity))
        .routes(routes!(media::unlink_from_entity))
        .routes(routes!(media::set_cover_for_entity))
        .routes(routes!(media::clear_cover_for_entity))
        .routes(routes!(media::cleanup_orphans))
        .routes(routes!(media::reconcile_storage))
        // Tags
        .routes(routes!(tagging::put_tags))
        // Articles (CMS)
        .routes(routes!(article::get_all_cms))
        .routes(routes!(article::get_one_cms))
        .routes(routes!(article::post))
        .routes(routes!(article::put))
        .routes(routes!(article::delete))
        .routes(routes!(article::get_relations))
        .routes(routes!(article::put_relations))
        .layer(from_extractor_with_state::<EditorUser, AppState>(state))
}

fn admin_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(admin::create_editor))
        .layer(from_extractor_with_state::<AdminUser, AppState>(state))
}

async fn bootstrap_admin_if_missing(
    db: &Database,
    email: &str,
    password: &str,
) -> Result<(), AppError> {
    if db.users().by_email(email).await.is_ok() {
        return Ok(());
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| AppError::Internal("Failed to hash bootstrap password".into()))?
        .to_string();

    db.users()
        .create(UserCreate {
            username: "admin".into(),
            email: email.into(),
            password_hash,
            role: UserRole::Admin,
        })
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create bootstrap admin: {e}")))?;

    info!("Bootstrap admin user created successfully");
    Ok(())
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
        () = ctrl_c => {},
        () = terminate => {},
    }
}
