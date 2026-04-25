use std::pin::pin;
use std::time::Duration;

use base64::{Engine as _, engine::general_purpose};
use chrono::Utc;
use database::{
    Database,
    models::{entity_type::EntityType, internal_state::InternalStateKey, media::MediaCreate},
};
use futures::{Stream, StreamExt, stream};
use reqwest::Client;
use serde::de::DeserializeOwned;
use sha2::{Digest, Sha256};
use tokio::time::sleep;
use tracing::{info, warn};

use crate::error::{
    ImportEntity, ImportField, ImportItemError, ImportItemWarning, ImportRelation, ImporterError,
};
use crate::helper::extract_source_id;
use crate::models::{
    collection::ApiCollection,
    event::ApiEvent,
    event_price::ApiEventPrice,
    hall::ApiHall,
    location::ApiLocation,
    media::{ApiMediaGallery, ApiMediaItem},
    price::ApiPrice,
    price_rank::ApiPriceRank,
    production::ApiProduction,
    space::ApiSpace,
};
use uuid::Uuid;

pub mod error;
mod helper;
pub mod insert;
#[cfg(feature = "ai-normalization")]
pub mod normalization;
pub mod seed;
pub mod models {
    pub mod collection;
    pub mod event;
    pub mod event_price;
    pub mod genre;
    pub mod hall;
    pub mod localized_text;
    pub mod location;
    pub mod media;
    pub mod price;
    pub mod price_rank;
    pub mod production;
    pub mod space;
}

const API_BASE_URL: &str = "https://www.viernulvier.gent/api/v1";
const BASE_URL: &str = "https://www.viernulvier.gent";
const FETCH_RETRY_ATTEMPTS: u32 = 3;
const FETCH_INITIAL_BACKOFF_MS: u64 = 250;

pub struct ApiImporter {
    db: Database,
    auth_token: String,
    client: Client,
    s3_client: Option<aws_sdk_s3::Client>,
    s3_bucket: Option<String>,
}

impl ApiImporter {
    pub fn new(
        db: Database,
        auth_token: String,
        s3_client: Option<aws_sdk_s3::Client>,
        s3_bucket: Option<String>,
    ) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("selab6")
            .build()
            .unwrap();

        Self {
            db,
            auth_token,
            client,
            s3_client,
            s3_bucket,
        }
    }

    /// get the last time we updated from the external api
    ///
    /// defaults to a timestamp old enough to update all
    async fn get_last_updated(&self) -> String {
        self.db
            .internal()
            .get_value(InternalStateKey::LastApiUpdate)
            .await
            .unwrap_or_else(|e| {
                warn!("error when fetching last api update timestamp: {e}. updating all.");
                "2000-01-01T00:00:00Z".into()
            })
    }

    /// saves the last updated time
    async fn set_last_updated(&self, timestamp: String) {
        let _ = self
            .db
            .internal()
            .set_value(InternalStateKey::LastApiUpdate, &timestamp)
            .await;
    }

    /// updates all objects from the external api since we last updated
    pub async fn update_since_last(&self) -> Result<(), reqwest::Error> {
        let run_id = Uuid::now_v7();
        // Save the current timestamp now, before we start importing, so that any
        // updates made on the upstream API while we're running are still picked up
        // by the next run (the import takes a while).
        let current_ts = Utc::now().to_rfc3339();
        let last_update_ts = self.get_last_updated().await;

        // On first run, bootstrap from local seed files before hitting the live API.
        // The seed's max_updated_at becomes the starting point for the live fetch so
        // only records newer than the snapshot are pulled from the network.
        //
        // We persist the seed timestamp immediately after a successful seed import so
        // that a subsequent live-fetch failure doesn't cause the seed to re-run on the
        // next boot (and doesn't fall back to a full live fetch from EPOCH).
        let live_start_ts = if last_update_ts == "2000-01-01T00:00:00Z" {
            match self.bootstrap_from_seed().await {
                Some(seed_ts) => {
                    self.set_last_updated(seed_ts.clone()).await;
                    seed_ts
                }
                None => last_update_ts,
            }
        } else {
            last_update_ts
        };

        info!(live_start_ts = %live_start_ts, "starting live API fetch");

        // Order matters: a location contains spaces, a space contains halls,
        // a production has events, and events reference halls. We import the
        // dependencies before the dependents so relation lookups in each loop
        // can resolve to existing rows.
        let res = async {
            self.update_locations(&live_start_ts, run_id).await?;
            self.update_spaces(&live_start_ts, run_id).await?;
            self.update_halls(&live_start_ts, run_id).await?;
            self.update_productions(&live_start_ts, run_id).await?;
            self.update_prices(&live_start_ts, run_id).await?;
            self.update_price_ranks(&live_start_ts, run_id).await?;
            self.update_events(&live_start_ts, run_id).await?;
            self.update_event_prices(&live_start_ts, run_id).await?;
            Ok::<(), reqwest::Error>(())
        }
        .await;

        if res.is_ok() {
            self.set_last_updated(current_ts).await;
        }

        res
    }

    /// Imports seed JSON files and returns the seed's `max_updated_at` timestamp.
    /// Returns `None` if no seed is configured or if the import fails.
    async fn bootstrap_from_seed(&self) -> Option<String> {
        use crate::seed::SeedImporter;

        let seeder = SeedImporter::from_env(self.db.clone())?;
        let max_ts = seeder.max_updated_at()?;
        if let Err(e) = seeder.import_all().await {
            warn!(error = %e, "seed import failed, falling back to full live import");
            return None;
        }
        info!(max_updated_at = %max_ts, "seed import complete");
        Some(max_ts)
    }

    /// fetch a collection of objects from the api
    ///
    /// it is wrapped in a `ApiCollection` with additional information
    async fn fetch_collection<T: DeserializeOwned>(
        &self,
        path: &str,
        page: u32,
        updated_after: &str,
    ) -> Result<ApiCollection<T>, reqwest::Error> {
        let url = format!("{API_BASE_URL}{path}");
        let mut backoff = Duration::from_millis(FETCH_INITIAL_BACKOFF_MS);

        for attempt in 1..=FETCH_RETRY_ATTEMPTS {
            let request = self
                .client
                .get(&url)
                .query(&[
                    ("page", page.to_string().as_str()),
                    ("updated_at[after]", updated_after),
                ])
                .header("X-AUTH-TOKEN", &self.auth_token);

            let response = match request.send().await {
                Ok(response) => response,
                Err(err) if attempt < FETCH_RETRY_ATTEMPTS => {
                    warn!(
                        "API fetch failed for {path} page {page} (attempt {attempt}/{FETCH_RETRY_ATTEMPTS}), retrying: {err}"
                    );
                    sleep(backoff).await;
                    backoff *= 2;
                    continue;
                }
                Err(err) => return Err(err),
            };

            return response.error_for_status()?.json().await;
        }

        unreachable!("fetch retry loop returns on success or final error")
    }

    /// make a stream over the pages of the collection api results
    fn paginated_collection<T: DeserializeOwned>(
        &self,
        path: &str,
        updated_after: &str,
    ) -> impl Stream<Item = Result<Vec<T>, reqwest::Error>> {
        stream::unfold(Some(1), move |page_opt| async move {
            let page = page_opt?;

            match self.fetch_collection::<T>(path, page, updated_after).await {
                Ok(collection) => {
                    let next_page = collection.view.next.map(|_| page + 1);
                    Some((Ok(collection.members), next_page))
                }
                Err(e) => Some((Err(e), None)),
            }
        })
    }

    async fn record_item_error(
        &self,
        run_id: Uuid,
        stage: &str,
        source_id: Option<i32>,
        error: &ImportItemError,
    ) {
        warn!("{stage}: {error}");

        if let Err(record_error) = self
            .db
            .import_errors()
            .record(error.to_import_error(run_id, source_id))
            .await
        {
            warn!("{stage}: failed to record import error: {record_error}");
        }
    }

    async fn record_item_warning(
        &self,
        run_id: Uuid,
        stage: &str,
        source_id: Option<i32>,
        warning: &ImportItemWarning,
    ) {
        warn!("{stage}: {warning}");

        if let Err(record_error) = self
            .db
            .import_errors()
            .record(warning.to_import_error(run_id, source_id))
            .await
        {
            warn!("{stage}: failed to record import warning: {record_error}");
        }
    }

    /// Resolve previously-recorded import errors for everything that succeeded
    /// in the current batch in a single round trip. Called once per page of
    /// items, instead of once per successful item, to avoid one wasted UPDATE
    /// per item on full re-imports.
    async fn resolve_item_errors_batch(&self, stage: &str, entity: &str, source_ids: &[i32]) {
        if source_ids.is_empty() {
            return;
        }

        if let Err(resolve_error) = self
            .db
            .import_errors()
            .resolve_for_items(entity, source_ids)
            .await
        {
            warn!("{stage}: failed to resolve previous import errors: {resolve_error}");
        }
    }

    pub async fn update_productions(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Productions: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiProduction>("/productions", updated_after));

        while let Some(batch_result) = stream.next().await {
            let productions = batch_result?;
            let amt = productions.len();
            info!("Productions: got {amt} from api");
            let mut resolved_source_ids: Vec<i32> = Vec::new();
            for production in productions {
                let production_source_id_hint = extract_source_id(&production.id);
                let galleries = [
                    (production.media_gallery.clone(), "media"),
                    (production.review_gallery.clone(), "review"),
                    (production.poster_gallery.clone(), "poster"),
                ];

                #[cfg(feature = "ai-normalization")]
                if let Some(source_id) = production_source_id_hint {
                    normalization::normalize_production(&self.db, &production, source_id).await;
                }

                let production_source_id = match production.upsert_import(&self.db).await {
                    Ok(source_id) => source_id,
                    Err(err) => {
                        self.record_item_error(
                            run_id,
                            "Productions",
                            production_source_id_hint,
                            &err,
                        )
                        .await;
                        continue;
                    }
                };

                if let Some(source_id) = production_source_id {
                    resolved_source_ids.push(source_id);
                }

                let Some(source_id) = production_source_id else {
                    continue;
                };

                for (gallery_url, gallery_type) in galleries {
                    if let Some(url) = gallery_url {
                        self.import_gallery_for_production(run_id, &url, source_id, gallery_type)
                            .await;
                    }
                }
            }
            self.resolve_item_errors_batch("Productions", "production", &resolved_source_ids)
                .await;
            info!("Productions: inserted {amt} into db");
        }

        info!("Productions: finished importing");
        Ok(())
    }

    pub async fn update_locations(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Locations: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiLocation>("/locations", updated_after));

        while let Some(batch_result) = stream.next().await {
            let locations = batch_result?;
            let amt = locations.len();
            info!("Locations: got {amt} from api");
            let mut resolved_source_ids: Vec<i32> = Vec::new();
            for location in locations {
                let location_source_id = extract_source_id(&location.id);
                match location.upsert_import(&self.db).await {
                    Ok(Some(source_id)) => {
                        resolved_source_ids.push(source_id);
                    }
                    Ok(None) => {}
                    Err(err) => {
                        self.record_item_error(run_id, "Locations", location_source_id, &err)
                            .await;
                    }
                }
            }
            self.resolve_item_errors_batch("Locations", "location", &resolved_source_ids)
                .await;
            info!("Locations: inserted {amt} into db");
        }

        info!("Locations: finished importing");
        Ok(())
    }

    pub async fn update_spaces(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Spaces: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiSpace>("/spaces", updated_after));

        while let Some(batch_result) = stream.next().await {
            let spaces = batch_result?;
            let amt = spaces.len();
            info!("Spaces: got {amt} from api");
            let mut resolved_source_ids: Vec<i32> = Vec::new();
            for space in spaces {
                let space_source_id = extract_source_id(&space.id);
                match space.upsert_import(&self.db).await {
                    Ok(Some(source_id)) => {
                        resolved_source_ids.push(source_id);
                    }
                    Ok(None) => {}
                    Err(err) => {
                        self.record_item_error(run_id, "Spaces", space_source_id, &err)
                            .await;
                    }
                }
            }
            self.resolve_item_errors_batch("Spaces", "space", &resolved_source_ids)
                .await;
            info!("Spaces: inserted {amt} into db");
        }

        info!("Spaces: finished importing");
        Ok(())
    }

    pub async fn update_halls(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Halls: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiHall>("/halls", updated_after));

        while let Some(batch_result) = stream.next().await {
            let halls = batch_result?;
            let amt = halls.len();
            info!("Halls: got {amt} from api");
            let mut resolved_source_ids: Vec<i32> = Vec::new();
            for hall in halls {
                let hall_source_id = extract_source_id(&hall.id);
                match hall.upsert_import(&self.db).await {
                    Ok(conversion) => {
                        if let Some(source_id) = conversion.value {
                            resolved_source_ids.push(source_id);
                        }
                        for warning in &conversion.warnings {
                            self.record_item_warning(run_id, "Halls", hall_source_id, warning)
                                .await;
                        }
                    }
                    Err(err) => {
                        self.record_item_error(run_id, "Halls", hall_source_id, &err)
                            .await;
                    }
                }
            }
            self.resolve_item_errors_batch("Halls", "hall", &resolved_source_ids)
                .await;
            info!("Halls: inserted {amt} into db");
        }

        info!("Halls: finished importing");
        Ok(())
    }

    pub async fn update_events(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Events: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiEvent>("/events", updated_after));

        while let Some(batch_result) = stream.next().await {
            let events = batch_result?;
            let amt = events.len();
            info!("Events: got {amt} from api");
            let mut resolved_source_ids: Vec<i32> = Vec::new();
            for event in events {
                let event_source_id = extract_source_id(&event.id);
                match event.upsert_import(&self.db).await {
                    Ok(conversion) => {
                        if let Some(source_id) = conversion.value {
                            resolved_source_ids.push(source_id);
                        }
                        for warning in &conversion.warnings {
                            self.record_item_warning(run_id, "Events", event_source_id, warning)
                                .await;
                        }
                    }
                    Err(err) => {
                        self.record_item_error(run_id, "Events", event_source_id, &err)
                            .await;
                    }
                }
            }
            self.resolve_item_errors_batch("Events", "event", &resolved_source_ids)
                .await;
            info!("Events: inserted {amt} into db");
        }

        info!("Events: finished importing");
        Ok(())
    }
    pub async fn update_prices(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("Prices: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiPrice>("/prices", updated_after));

        while let Some(batch_result) = stream.next().await {
            let prices = batch_result?;
            let amt = prices.len();
            let mut resolved_source_ids = Vec::new();
            info!("Prices: got {amt} from api");
            for price in prices {
                let price_source_id = extract_source_id(&price.id);

                match price.upsert_import(&self.db).await {
                    Ok(conversion) => {
                        if let Some(source_id) = conversion.value {
                            resolved_source_ids.push(source_id);
                        }
                    }
                    Err(err) => {
                        self.record_item_error(run_id, "Prices", price_source_id, &err)
                            .await;
                    }
                }
            }

            self.resolve_item_errors_batch("Prices", "price", &resolved_source_ids)
                .await;
            info!("Prices: inserted {amt} into db");
        }

        info!("Prices: finished importing");
        Ok(())
    }

    pub async fn update_price_ranks(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("PriceRanks: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiPriceRank>("/prices/ranks", updated_after));

        while let Some(batch_result) = stream.next().await {
            let ranks = batch_result?;
            let amt = ranks.len();
            let mut resolved_source_ids = Vec::new();
            info!("PriceRanks: got {amt} from api");
            for rank in ranks {
                let rank_source_id = extract_source_id(&rank.id);

                match rank.upsert_import(&self.db).await {
                    Ok(conversion) => {
                        if let Some(source_id) = conversion.value {
                            resolved_source_ids.push(source_id);
                        }
                    }
                    Err(err) => {
                        self.record_item_error(run_id, "PriceRanks", rank_source_id, &err)
                            .await;
                    }
                }
            }

            self.resolve_item_errors_batch("PriceRanks", "price_rank", &resolved_source_ids)
                .await;
            info!("PriceRanks: inserted {amt} into db");
        }

        info!("PriceRanks: finished importing");
        Ok(())
    }

    pub async fn update_event_prices(
        &self,
        updated_after: &str,
        run_id: Uuid,
    ) -> Result<(), reqwest::Error> {
        info!("EventPrices: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiEventPrice>("/events/prices", updated_after));

        while let Some(batch_result) = stream.next().await {
            let event_prices = batch_result?;
            let amt = event_prices.len();
            let mut resolved_source_ids = Vec::new();
            info!("EventPrices: got {amt} from api");
            for event_price in event_prices {
                let event_price_source_id = extract_source_id(&event_price.id);

                match event_price.upsert_import(&self.db).await {
                    Ok(conversion) => {
                        if let Some(source_id) = conversion.value {
                            resolved_source_ids.push(source_id);
                        }
                    }
                    Err(err) => {
                        self.record_item_error(run_id, "EventPrices", event_price_source_id, &err)
                            .await;
                    }
                }
            }

            self.resolve_item_errors_batch("EventPrices", "event_price", &resolved_source_ids)
                .await;
            info!("EventPrices: inserted {amt} into db");
        }

        info!("EventPrices: finished importing");
        Ok(())
    }

    async fn import_gallery_for_production(
        &self,
        run_id: Uuid,
        gallery_url: &str,
        production_source_id: i32,
        gallery_type: &str,
    ) {
        if self.s3_client.is_none() || self.s3_bucket.is_none() {
            return;
        }

        let url = format!("{BASE_URL}{gallery_url}");
        let gallery: ApiMediaGallery = match self
            .client
            .get(&url)
            .header("X-AUTH-TOKEN", &self.auth_token)
            .send()
            .await
        {
            Ok(response) => match response.error_for_status() {
                Ok(response) => match response.json().await {
                    Ok(gallery) => gallery,
                    Err(err) => {
                        self.record_item_error(
                            run_id,
                            "Gallery",
                            Some(production_source_id),
                            &ImportItemError::import_failure(
                                ImportEntity::Gallery,
                                Some(ImportField::GalleryUrl),
                                Some(production_source_id),
                                format!("failed to decode gallery {url}: {err}"),
                            ),
                        )
                        .await;
                        return;
                    }
                },
                Err(err) => {
                    self.record_item_error(
                        run_id,
                        "Gallery",
                        Some(production_source_id),
                        &ImportItemError::import_failure(
                            ImportEntity::Gallery,
                            Some(ImportField::GalleryUrl),
                            Some(production_source_id),
                            format!("gallery request failed for {url}: {err}"),
                        ),
                    )
                    .await;
                    return;
                }
            },
            Err(err) => {
                self.record_item_error(
                    run_id,
                    "Gallery",
                    Some(production_source_id),
                    &ImportItemError::import_failure(
                        ImportEntity::Gallery,
                        Some(ImportField::GalleryUrl),
                        Some(production_source_id),
                        format!("gallery request failed for {url}: {err}"),
                    ),
                )
                .await;
                return;
            }
        };

        let production = match self
            .db
            .productions()
            .by_source_id(production_source_id)
            .await
        {
            Ok(Some(production)) => production,
            Ok(None) => {
                self.record_item_error(
                    run_id,
                    "Gallery",
                    Some(production_source_id),
                    &ImportItemError::missing_relation(
                        ImportEntity::Gallery,
                        ImportRelation::Production,
                        production_source_id,
                    ),
                )
                .await;
                return;
            }
            Err(err) => {
                self.record_item_error(
                    run_id,
                    "Gallery",
                    Some(production_source_id),
                    &ImportItemError::database_lookup(
                        ImportEntity::Gallery,
                        ImportRelation::Production,
                        production_source_id,
                        err,
                    ),
                )
                .await;
                return;
            }
        };

        let mut count = 0;
        let mut resolved_media_source_ids = Vec::new();
        for item in gallery.items {
            let item_url = item.id.clone().unwrap_or_default();
            if let Some(source_id) = self
                .import_media_item(
                    run_id,
                    item,
                    &item_url,
                    production.production.id,
                    production_source_id,
                    gallery_type,
                )
                .await
            {
                resolved_media_source_ids.push(source_id);
            }
            count += 1;
        }

        self.resolve_item_errors_batch("Gallery", "gallery", &[production_source_id])
            .await;
        self.resolve_item_errors_batch("Media", "media", &resolved_media_source_ids)
            .await;

        if count > 0 {
            info!(
                "Media: imported {count} {gallery_type} items for production source_id {production_source_id}"
            );
        }
    }

    async fn import_media_item(
        &self,
        run_id: Uuid,
        item: ApiMediaItem,
        item_url: &str,
        production_id: Uuid,
        production_source_id: i32,
        gallery_type: &str,
    ) -> Option<i32> {
        let source_id = extract_source_id(item_url);

        let title_nl = item.title.nl;
        let title_en = item.title.en;
        let title_fr = item.title.fr;

        let description_nl = item.description.nl;
        let description_en = item.description.en;
        let description_fr = item.description.fr;

        let credit_nl = item.credits.nl;
        let credit_en = item.credits.en;
        let credit_fr = item.credits.fr;

        let format_info = get_format_info(item.format.as_deref().unwrap_or(""));
        let mime_type = format_info.mime.to_string();

        let mut cdn_url = item.link.nl.or(item.link.en).or(item.link.fr);
        if cdn_url.is_none() {
            for crop in &item.crops {
                if let Some(url) = &crop.url
                    && let Some(decoded) = decode_url_from_crop(url)
                {
                    cdn_url = Some(decoded);
                    break;
                }
            }

            if cdn_url.is_none() {
                if let Some(hd_crop) = item.crops.iter().find(|c| {
                    c.name.as_deref() == Some("hd_ready") || c.name.as_deref() == Some("FE3_header")
                }) {
                    cdn_url = hd_crop.url.clone();
                } else if let Some(first_crop) = item.crops.first() {
                    cdn_url = first_crop.url.clone();
                }
            }
        }

        match self.db.media().by_source_uri("viernulvier", item_url).await {
            Ok(Some(_)) => return source_id,
            Ok(None) => {}
            Err(err) => {
                if let Some(source_id) = source_id {
                    self.record_item_error(
                        run_id,
                        "Media",
                        Some(source_id),
                        &ImportItemError::database_lookup(
                            ImportEntity::Media,
                            ImportRelation::Media,
                            source_id,
                            err,
                        ),
                    )
                    .await;
                } else {
                    self.record_item_error(
                        run_id,
                        "Media",
                        None,
                        &ImportItemError::database_write(ImportEntity::Media, None, err),
                    )
                    .await;
                }
                return None;
            }
        };

        let Some(url) = &cdn_url else {
            self.record_item_error(
                run_id,
                "Media",
                source_id,
                &ImportItemError::missing_required_field(ImportEntity::Media, ImportField::CdnUrl),
            )
            .await;
            return None;
        };

        let s3_client = self.s3_client.as_ref().unwrap();
        let s3_bucket = self.s3_bucket.as_ref().unwrap();

        let (s3_key, checksum, file_size) = match self
            .download_and_upload(
                s3_client,
                s3_bucket,
                url,
                production_source_id,
                gallery_type,
                item.format.as_deref().unwrap_or(""),
            )
            .await
        {
            Ok(result) => result,
            Err(e) => {
                self.record_item_error(
                    run_id,
                    "Media",
                    source_id,
                    &ImportItemError::import_failure(
                        ImportEntity::Media,
                        Some(ImportField::CdnUrl),
                        source_id,
                        format!("download/upload failed for {url}: {e}"),
                    ),
                )
                .await;
                return None;
            }
        };

        let media_create = MediaCreate {
            s3_key,
            mime_type: mime_type.clone(),
            file_size: Some(file_size),
            width: item.width.map(|w| w as i32),
            height: item.height.map(|h| h as i32),
            checksum: Some(checksum),
            alt_text_nl: title_nl,
            alt_text_en: title_en,
            alt_text_fr: title_fr,
            description_nl,
            description_en,
            description_fr,
            credit_nl,
            credit_en,
            credit_fr,
            geo_latitude: None,
            geo_longitude: None,
            parent_id: None,
            derivative_type: None,
            gallery_type: Some(gallery_type.to_string()),
            source_id,
            source_system: "viernulvier".to_string(),
            source_uri: Some(item_url.to_string()),
            source_updated_at: item.updated_at,
        };

        let media = match self.db.media().insert(media_create).await {
            Ok(media) => media,
            Err(err) => {
                self.record_item_error(
                    run_id,
                    "Media",
                    source_id,
                    &ImportItemError::database_write(ImportEntity::Media, source_id, err),
                )
                .await;
                return None;
            }
        };

        let is_cover = item.position == Some(0);
        let role = if is_cover && gallery_type == "media" {
            "cover"
        } else {
            media_role_from_gallery_type(gallery_type)
        };
        if let Err(err) = self
            .db
            .media()
            .link_to_entity(
                EntityType::Production,
                production_id,
                media.id,
                role,
                item.position.unwrap_or(999) as i32,
                is_cover,
            )
            .await
        {
            self.record_item_error(
                run_id,
                "Media",
                source_id,
                &ImportItemError::database_write(ImportEntity::Media, source_id, err),
            )
            .await;
            return None;
        }

        for crop in item.crops {
            if let (Some(name), Some(url)) = (crop.name, crop.url)
                && (name == "hd_ready" || name == "FE3_header")
            {
                let format = item.format.as_deref().unwrap_or("");
                let format_info = get_format_info(format);
                let ext = format_info.extension;
                let file_uuid = Uuid::now_v7();
                let crop_s3_key = format!(
                    "media/production/{production_source_id}/{gallery_type}/crop_{name}_{file_uuid}.{ext}"
                );

                match self
                    .download_and_upload_to_key(s3_client, s3_bucket, &url, &crop_s3_key, format)
                    .await
                {
                    Ok((checksum, file_size, width, height)) => {
                        let upsert = database::repos::media_variant::CropVariantUpsert {
                            media_id: media.id,
                            crop_name: name.clone(),
                            s3_key: crop_s3_key,
                            mime_type: Some(format_info.mime.to_string()),
                            file_size: Some(file_size),
                            width,
                            height,
                            checksum: Some(checksum),
                            source_uri: Some(url),
                        };
                        if let Err(err) = self.db.media_variants().upsert_crop(upsert).await {
                            self.record_item_warning(
                                run_id,
                                "MediaVariant",
                                source_id,
                                &ImportItemWarning::UnexpectedFieldValue {
                                    entity: ImportEntity::MediaVariant,
                                    field: ImportField::Crop,
                                    value: format!("failed to upsert crop {name}: {err}"),
                                    fallback: "media_without_crop_variant",
                                },
                            )
                            .await;
                        }
                    }
                    Err(e) => {
                        self.record_item_warning(
                            run_id,
                            "MediaVariant",
                            source_id,
                            &ImportItemWarning::UnexpectedFieldValue {
                                entity: ImportEntity::MediaVariant,
                                field: ImportField::Crop,
                                value: format!("failed to download/upload crop {name}: {e}"),
                                fallback: "media_without_crop_variant",
                            },
                        )
                        .await;
                    }
                }
            }
        }

        source_id
    }

    async fn download_and_upload(
        &self,
        s3_client: &aws_sdk_s3::Client,
        s3_bucket: &str,
        cdn_url: &str,
        production_source_id: i32,
        gallery_type: &str,
        format: &str,
    ) -> Result<(String, String, i64), ImporterError> {
        let format_info = get_format_info(format);
        let ext = format_info.extension;
        let file_uuid = Uuid::now_v7();
        let s3_key =
            format!("media/production/{production_source_id}/{gallery_type}/{file_uuid}.{ext}");

        let (checksum, file_size, _, _) = self
            .download_and_upload_to_key(s3_client, s3_bucket, cdn_url, &s3_key, format)
            .await?;

        Ok((s3_key, checksum, file_size))
    }

    async fn download_and_upload_to_key(
        &self,
        s3_client: &aws_sdk_s3::Client,
        s3_bucket: &str,
        source_url: &str,
        s3_key: &str,
        format: &str,
    ) -> Result<(String, i64, Option<i32>, Option<i32>), ImporterError> {
        let response = self
            .client
            .get(source_url)
            .send()
            .await?
            .error_for_status()?;

        let temp_file = tempfile::Builder::new()
            .prefix("viernulvier_import_")
            .tempfile()?;

        let mut file = tokio::fs::File::from_std(temp_file.as_file().try_clone()?);

        let mut hasher = Sha256::new();
        let mut file_size = 0i64;
        let mut stream = response.bytes_stream();

        use tokio::io::AsyncWriteExt;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk).await?;
            hasher.update(&chunk);
            file_size += chunk.len() as i64;
        }

        file.flush().await?;
        drop(file);
        let checksum = hex::encode(hasher.finalize());

        let (width, height) = imagesize::size(temp_file.path()).map_or((None, None), |d| {
            (Some(d.width as i32), Some(d.height as i32))
        });

        let byte_stream = aws_sdk_s3::primitives::ByteStream::from_path(temp_file.path())
            .await
            .map_err(|e| ImporterError::S3(e.to_string()))?;

        s3_client
            .put_object()
            .bucket(s3_bucket)
            .key(s3_key)
            .body(byte_stream)
            .content_type(get_format_info(format).mime)
            .send()
            .await
            .map_err(|e| ImporterError::S3(e.to_string()))?;

        Ok((checksum, file_size, width, height))
    }
}

fn decode_url_from_crop(crop_url: &str) -> Option<String> {
    let b64_part = crop_url.split('/').next_back()?;

    let engines = [
        general_purpose::URL_SAFE_NO_PAD,
        general_purpose::URL_SAFE,
        general_purpose::STANDARD_NO_PAD,
        general_purpose::STANDARD,
    ];

    for engine in engines {
        if let Ok(bytes) = engine.decode(b64_part)
            && let Ok(url) = String::from_utf8(bytes)
            && url.starts_with("http")
        {
            return Some(url);
        }
    }
    None
}

#[derive(Copy, Clone)]
struct FormatInfo {
    extension: &'static str,
    mime: &'static str,
}

fn get_format_info(format: &str) -> FormatInfo {
    let fmt = format.to_ascii_lowercase();
    match () {
        () if fmt.contains("jpeg") || fmt.contains("jpg") => FormatInfo {
            extension: "jpg",
            mime: "image/jpeg",
        },
        () if fmt.contains("png") => FormatInfo {
            extension: "png",
            mime: "image/png",
        },
        () if fmt.contains("gif") => FormatInfo {
            extension: "gif",
            mime: "image/gif",
        },
        () if fmt.contains("webp") => FormatInfo {
            extension: "webp",
            mime: "image/webp",
        },
        () if fmt.contains("svg") => FormatInfo {
            extension: "svg",
            mime: "image/svg+xml",
        },
        () if fmt.contains("mp4") => FormatInfo {
            extension: "mp4",
            mime: "video/mp4",
        },
        () if fmt.contains("pdf") => FormatInfo {
            extension: "pdf",
            mime: "application/pdf",
        },
        () => FormatInfo {
            extension: "bin",
            mime: "application/octet-stream",
        },
    }
}

fn media_role_from_gallery_type(gallery_type: &str) -> &str {
    match gallery_type {
        "media" => "gallery",
        "poster" => "poster",
        "review" => "review",
        other => other,
    }
}
