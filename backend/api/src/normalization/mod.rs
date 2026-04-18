pub mod client;
pub mod config;
pub mod log;
pub mod pre_pass;
pub mod prompt;
pub mod schema;

use std::sync::OnceLock;

use database::Database;

use crate::models::production::ApiProduction;

use self::{client::GroqClient, config::NormalizationConfig};

/// `None` = disabled this run (bad config or missing key).
static NORMALIZER: OnceLock<Option<NormalizerCtx>> = OnceLock::new();

pub struct NormalizerCtx {
    pub config: NormalizationConfig,
    pub client: GroqClient,
}

fn init() -> Option<NormalizerCtx> {
    let config = match NormalizationConfig::from_env() {
        Ok(cfg) => cfg,
        Err(err) => {
            tracing::warn!(error = %err, "normalization disabled: invalid config");
            return None;
        }
    };

    let Some(api_key) = config.api_key.clone() else {
        tracing::warn!("LLM_API_KEY not set - normalization skipped");
        return None;
    };

    match GroqClient::new(api_key, config.model.clone(), config.base_url.clone()) {
        Ok(client) => {
            tracing::info!(
                model = %config.model,
                threshold = config.confidence_threshold,
                "normalization enabled"
            );
            Some(NormalizerCtx { config, client })
        }
        Err(err) => {
            tracing::warn!(error = %err, "normalization disabled: could not build client");
            None
        }
    }
}

fn get_or_init() -> Option<&'static NormalizerCtx> {
    NORMALIZER.get_or_init(init).as_ref()
}

/// Stub; extraction logic lands in #255/#256/#257.
#[allow(clippy::unused_async)]
pub async fn normalize_production(_db: &Database, production: &ApiProduction, source_id: i32) {
    let Some(_ctx) = get_or_init() else {
        return;
    };

    tracing::debug!(
        source_id = source_id,
        production_url = %production.id,
        "normalization stub: production observed"
    );
}
