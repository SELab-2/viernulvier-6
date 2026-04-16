use std::collections::HashMap;
use std::pin::pin;

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
use tracing::{info, warn};

use crate::error::ImporterError;
use crate::helper::extract_source_id;
use crate::models::{
    collection::ApiCollection,
    event::ApiEvent,
    event_price::ApiEventPrice,
    event_status::ApiEventStatus,
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
pub mod models {
    pub mod collection;
    pub mod event;
    pub mod event_price;
    pub mod event_status;
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
                "1900-01-01T00:00:00Z".into()
            })
    }

    /// saves the last updated time
    async fn set_last_updated(&self, timestamp: String) {
        let _ = self // ignore the result, if not saved, we import again later
            .db
            .internal()
            .set_value(InternalStateKey::LastApiUpdate, &timestamp)
            .await;
    }

    /// updates all objects from the external api since we last updated
    pub async fn update_since_last(&self) -> Result<(), reqwest::Error> {
        // save the current timestamp now, to insure we don't lose any updated items
        // this can happen when updates are made while we are importing, as it takes quite long
        let current_ts = Utc::now().to_rfc3339();
        let last_update_ts = self.get_last_updated().await;

        // TODO start transactions
        // order : locations -> spaces -> halls
        // a location contains a space, which in turn contains one or more hall
        let res = async {
            self.update_locations(&last_update_ts).await?;
            self.update_spaces(&last_update_ts).await?;
            self.update_halls(&last_update_ts).await?;
            self.update_productions(&last_update_ts).await?;
            self.update_prices(&last_update_ts).await?;
            self.update_price_ranks(&last_update_ts).await?;
            self.update_events(&last_update_ts).await?;
            self.update_event_prices(&last_update_ts).await?;
            Ok::<(), reqwest::Error>(())
        }
        .await;

        // save timestamp for next time
        if res.is_ok() {
            self.set_last_updated(current_ts).await;
        }

        res
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

        let request = self.client.get(&url).query(&[
            ("page", page.to_string().as_str()),
            ("updated_at[after]", updated_after),
        ]);

        request
            .header("X-AUTH-TOKEN", &self.auth_token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    /// make a stream over the pages of the collection api results
    fn paginated_collection<T: DeserializeOwned>(
        &self,
        path: &str,
        updated_after: &str,
    ) -> impl Stream<Item = Result<Vec<T>, reqwest::Error>> {
        stream::unfold(Some(1), move |page_opt| async move {
            let page = page_opt?; // stop when page_opt is None

            match self.fetch_collection::<T>(path, page, updated_after).await {
                Ok(collection) => {
                    let next_page = collection.view.next.map(|_| page + 1);
                    Some((Ok(collection.members), next_page))
                }
                Err(e) => Some((Err(e), None)),
            }
        })
    }

    pub async fn update_productions(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Productions: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiProduction>("/productions", updated_after));

        while let Some(batch_result) = stream.next().await {
            let productions = batch_result?;
            let amt = productions.len();
            info!("Productions: got {amt} from api");
            for production in productions {
                let galleries = [
                    (production.media_gallery.clone(), "media"),
                    (production.review_gallery.clone(), "review"),
                    (production.poster_gallery.clone(), "poster"),
                ];

                let production_source_id = production.insert(&self.db).await.unwrap();

                let Some(source_id) = production_source_id else {
                    continue;
                };

                for (gallery_url, gallery_type) in galleries {
                    if let Some(url) = gallery_url
                        && let Err(e) = self
                            .import_gallery_for_production(&url, source_id, gallery_type)
                            .await
                    {
                        warn!(
                            "Productions: failed to import {gallery_type} gallery for source_id {source_id}: {e}"
                        );
                    }
                }
            }
            info!("Productions: inserted {amt} into db");
        }

        info!("Productions: finished importing");
        Ok(())
    }

    pub async fn update_locations(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Locations: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiLocation>("/locations", updated_after));

        while let Some(batch_result) = stream.next().await {
            let locations = batch_result?;
            let amt = locations.len();
            info!("Locations: got {amt} from api");
            for location in locations {
                location.insert(&self.db).await.unwrap();
            }
            info!("Locations: inserted {amt} into db");
        }

        info!("Locations: finished importing");
        Ok(())
    }

    pub async fn update_spaces(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Spaces: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiSpace>("/spaces", updated_after));

        while let Some(batch_result) = stream.next().await {
            let spaces = batch_result?;
            let amt = spaces.len();
            info!("Spaces: got {amt} from api");
            for space in spaces {
                space.insert(&self.db).await.unwrap();
            }
            info!("Spaces: inserted {amt} into db");
        }

        info!("Spaces: finished importing");
        Ok(())
    }

    pub async fn update_halls(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Halls: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiHall>("/halls", updated_after));

        while let Some(batch_result) = stream.next().await {
            let halls = batch_result?;
            let amt = halls.len();
            info!("Halls: got {amt} from api");
            for hall in halls {
                hall.insert(&self.db).await.unwrap();
            }
            info!("Halls: inserted {amt} into db");
        }

        info!("Halls: finished importing");
        Ok(())
    }

    pub async fn update_events(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Events: start updating");

        // Resolve status IRIs to human-readable strings. We drain the whole
        // /events/statuses collection once and keep an in-memory @id -> display
        // lookup for the rest of this import run. Without this the status
        // column ends up storing the raw IRI like "/api/v1/events/statuses/1".
        let mut status_map: HashMap<String, String> = HashMap::new();
        let mut statuses = pin!(
            self.paginated_collection::<ApiEventStatus>("/events/statuses", "1900-01-01T00:00:00Z")
        );
        while let Some(batch_result) = statuses.next().await {
            for s in batch_result? {
                let display = s.display();
                status_map.insert(s.id, display);
            }
        }
        info!("Events: loaded {} status entries", status_map.len());

        let mut stream = pin!(self.paginated_collection::<ApiEvent>("/events", updated_after));

        while let Some(batch_result) = stream.next().await {
            let events = batch_result?;
            let amt = events.len();
            info!("Events: got {amt} from api");
            let mut inserted: usize = 0;
            for event in events {
                if event.insert(&self.db, &status_map).await.unwrap() {
                    inserted += 1;
                }
            }
            info!("Events: inserted {inserted} of {amt} from api");
        }

        info!("Events: finished importing");
        Ok(())
    }
    pub async fn update_prices(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Prices: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiPrice>("/prices", updated_after));

        while let Some(batch_result) = stream.next().await {
            let prices = batch_result?;
            let amt = prices.len();
            info!("Prices: got {amt} from api");
            for price in prices {
                price.insert(&self.db).await.unwrap();
            }
            info!("Prices: inserted {amt} into db");
        }

        info!("Prices: finished importing");
        Ok(())
    }

    pub async fn update_price_ranks(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("PriceRanks: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiPriceRank>("/prices/ranks", updated_after));

        while let Some(batch_result) = stream.next().await {
            let ranks = batch_result?;
            let amt = ranks.len();
            info!("PriceRanks: got {amt} from api");
            for rank in ranks {
                rank.insert(&self.db).await.unwrap();
            }
            info!("PriceRanks: inserted {amt} into db");
        }

        info!("PriceRanks: finished importing");
        Ok(())
    }

    pub async fn update_event_prices(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("EventPrices: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiEventPrice>("/events/prices", updated_after));

        while let Some(batch_result) = stream.next().await {
            let event_prices = batch_result?;
            let amt = event_prices.len();
            info!("EventPrices: got {amt} from api");
            for event_price in event_prices {
                event_price.insert(&self.db).await.unwrap();
            }
            info!("EventPrices: inserted {amt} into db");
        }

        info!("EventPrices: finished importing");
        Ok(())
    }

    async fn import_gallery_for_production(
        &self,
        gallery_url: &str,
        production_source_id: i32,
        gallery_type: &str,
    ) -> Result<(), reqwest::Error> {
        if self.s3_client.is_none() || self.s3_bucket.is_none() {
            return Ok(());
        }

        let url = format!("{BASE_URL}{gallery_url}");
        let gallery: ApiMediaGallery = self
            .client
            .get(url)
            .header("X-AUTH-TOKEN", &self.auth_token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let Ok(Some(production)) = self
            .db
            .productions()
            .by_source_id(production_source_id)
            .await
        else {
            warn!("Media: production source_id {production_source_id} not found");
            return Ok(());
        };

        let mut count = 0;
        for item in gallery.items {
            let item_url = item.id.clone().unwrap_or_default();
            self.import_media_item(
                item,
                &item_url,
                production.production.id,
                production_source_id,
                gallery_type,
            )
            .await;
            count += 1;
        }

        if count > 0 {
            info!(
                "Media: imported {count} {gallery_type} items for production source_id {production_source_id}"
            );
        }

        Ok(())
    }

    async fn import_media_item(
        &self,
        item: ApiMediaItem,
        item_url: &str,
        production_id: Uuid,
        production_source_id: i32,
        gallery_type: &str,
    ) {
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

        if self
            .db
            .media()
            .by_source_uri("viernulvier", item_url)
            .await
            .is_ok_and(|m| m.is_some())
        {
            return;
        }

        let Some(url) = &cdn_url else {
            warn!("Media: skipping import for {item_url} because source URL is missing");
            return;
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
                warn!("Media: download/upload failed for {url}: {e}");
                return;
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

        if let Ok(media) = self.db.media().insert(media_create).await {
            let role = media_role_from_gallery_type(gallery_type);
            let is_cover = item.position == Some(0);
            let _ = self
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
                .await;

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
                        .download_and_upload_to_key(
                            s3_client,
                            s3_bucket,
                            &url,
                            &crop_s3_key,
                            format,
                        )
                        .await
                    {
                        Ok((checksum, file_size, width, height)) => {
                            let upsert = database::repos::media_variant::CropVariantUpsert {
                                media_id: media.id,
                                crop_name: name,
                                s3_key: crop_s3_key,
                                mime_type: Some(format_info.mime.to_string()),
                                file_size: Some(file_size),
                                width,
                                height,
                                checksum: Some(checksum),
                                source_uri: Some(url),
                            };
                            let _ = self.db.media_variants().upsert_crop(upsert).await;
                        }
                        Err(e) => {
                            tracing::warn!(
                                "Failed to download/upload crop '{name}' for media {}: {e}",
                                media.id
                            );
                        }
                    }
                }
            }
        }
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
