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

use crate::helper::extract_source_id;
use crate::models::{
    space::ApiSpace,
    collection::ApiCollection,
    event::ApiEvent,
    hall::ApiHall,
    location::ApiLocation,
    production::{ApiProduction, ProductionImportData},
    media::{ApiMediaGallery, ApiMediaItem},
};
use uuid::Uuid;
use crate::error::ImporterError;

pub mod error;
mod helper;
pub mod models {
    pub mod collection;
    pub mod event;
    pub mod genre;
    pub mod hall;
    pub mod localized_text;
    pub mod location;
    pub mod media;
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
                "2000-01-01T00:00:00Z".into()
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
            self.update_events(&last_update_ts).await?;
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
                let production_source_id = production
                    .id
                    .split('/')
                    .next_back()
                    .and_then(|s| s.parse::<i32>().ok());

                let galleries = [
                    (production.media_gallery.clone(), "media"),
                    (production.review_gallery.clone(), "review"),
                    (production.poster_gallery.clone(), "poster"),
                ];

                let data: ProductionImportData = production.into();
                self.db
                    .productions()
                    .insert(data.production, data.translations)
                    .await
                    .unwrap();

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
                self.db.locations().insert(location.into()).await.unwrap();
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
                // first load in the related location and extract its id
                let location_source_id = extract_source_id(&space.location).unwrap();

                let location = self
                    .db
                    .locations()
                    .by_source_id(location_source_id)
                    .await
                    .unwrap();

                // construct a SpaceCreate out of it
                let space_create = space.to_create(location.id);

                self.db.spaces().insert(space_create).await.unwrap();
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
                let source_id = hall.space.as_deref().and_then(extract_source_id);
                let space_uuid = match source_id {
                    Some(id) => {
                        // get the uuid of the space with a source id from the db
                        let db_uuid = self
                            .db
                            .spaces()
                            .by_source_id(id)
                            .await
                            .unwrap()
                            .map(|s| s.id);

                        if db_uuid.is_none() {
                            warn!("Halls: Space source_id {id} expected but not found in db");
                        }
                        db_uuid
                    }
                    None => None,
                };

                // construct a HallCreate out of it
                let hall_create = hall.to_create(space_uuid);

                self.db.halls().insert(hall_create).await.unwrap();
            }
            info!("Halls: inserted {amt} into db");
        }

        info!("Halls: finished importing");
        Ok(())
    }

    pub async fn update_events(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Events: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiEvent>("/events", updated_after));

        while let Some(batch_result) = stream.next().await {
            let events = batch_result?;
            let amt = events.len();
            info!("Events: got {amt} from api");
            for event in events {
                let Some(prod_source_id) = event.production_source_id() else {
                    warn!("Events: event has no production source_id, skipping");
                    continue;
                };

                let Some(production) = self
                    .db
                    .productions()
                    .by_source_id(prod_source_id)
                    .await
                    .unwrap()
                else {
                    warn!(
                        "Events: production source_id {prod_source_id} not found in db, skipping"
                    );
                    continue;
                };

                let hall_uuid = if let Some(hall_source_id) = event.hall_source_id() {
                    let hall_opt = self.db.halls().by_source_id(hall_source_id).await.unwrap();

                    if hall_opt.is_none() {
                        warn!("Events: hall source_id {hall_source_id} not found in db");
                    }

                    hall_opt.map(|h| h.id)
                } else {
                    None
                };

                let event_create = event.to_create(production.production.id, hall_uuid);
                self.db.events().insert(event_create).await.unwrap();
            }
            info!("Events: inserted {amt} into db");
        }

        info!("Events: finished importing");
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
                production.id,
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
            // try to decode the original URL from the end of a crop url
            for crop in &item.crops {
                if let Some(url) = &crop.url
                    && let Some(decoded) = decode_url_from_crop(url) {
                        cdn_url = Some(decoded);
                        break;
                    }
            }

            if cdn_url.is_none() {
                // TODO: Decide which crops we want to keep: we can only use hd_ready and scale down in the rust API or select a few crops
                if let Some(hd_crop) = item.crops.iter().find(|c| {
                    c.name.as_deref() == Some("hd_ready") || c.name.as_deref() == Some("FE3_header")
                }) {
                    cdn_url = hd_crop.url.clone();
                } else if let Some(first_crop) = item.crops.first() {
                    cdn_url = first_crop.url.clone();
                }
            }
        }

        // skip if already imported by source URI (stable idempotency)
        if self
            .db
            .media()
            .by_source_uri("viernulvier", item_url)
            .await
            .is_ok_and(|m| m.is_some())
        {
            return;
        }

        // importer policy: all imported media must be uploaded to S3; no external URL fallback
        let Some(url) = &cdn_url else {
            warn!("Media: skipping import for {item_url} because source URL is missing");
            return;
        };

        // We already checked these are some in import_gallery_for_production
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
                // return Ok so we continue to process the next items, it just won't be in the DB
                return;
            }
        };

        // store with s3_key
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

            // Download a single high-res crop to S3, save the others as external URLs
            for crop in item.crops {
                if let (Some(name), Some(url)) = (crop.name, crop.url) {
                    let mut variant_s3_key = String::new();
                    let mut variant_mime_type = None;
                    let mut variant_file_size = None;
                    let mut variant_checksum = None;

                    // Only download high-res variants
                    if name == "hd_ready" || name == "FE3_header" {
                        let format = item.format.as_deref().unwrap_or("");
                        let format_info = get_format_info(format);
                        let ext = format_info.extension;
                        let file_uuid = Uuid::now_v7();
                        let crop_s3_key = format!("media/production/{production_source_id}/{gallery_type}/crop_{name}_{file_uuid}.{ext}");

                        if let Ok((checksum, file_size)) = self.download_and_upload_to_key(
                            s3_client,
                            s3_bucket,
                            &url,
                            &crop_s3_key,
                            format,
                        ).await {
                            variant_s3_key = crop_s3_key;
                            variant_mime_type = Some(format_info.mime.to_string());
                            variant_file_size = Some(file_size);
                            variant_checksum = Some(checksum);
                        }
                    }

                    let upsert = database::repos::media_variant::CropVariantUpsert {
                        media_id: media.id,
                        crop_name: name,
                        s3_key: variant_s3_key,
                        mime_type: variant_mime_type,
                        file_size: variant_file_size,
                        width: None,
                        height: None,
                        checksum: variant_checksum,
                        source_uri: Some(url),
                    };
                    let _ = self.db.media_variants().upsert_crop(upsert).await;
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

        let (checksum, file_size) = self
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
    ) -> Result<(String, i64), ImporterError> {
        // download from CDN
        let response = self
            .client
            .get(source_url)
            .send()
            .await?
            .error_for_status()?;

        // Create a temporary file to avoid loading the whole file in memory
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

        // upload to S3 using ByteStream from the temp file
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

        // The temp_file will be automatically deleted here when it goes out of scope

        Ok((checksum, file_size))
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
        () if fmt.contains("jpeg") || fmt.contains("jpg") => FormatInfo { extension: "jpg", mime: "image/jpeg" },
        () if fmt.contains("png") => FormatInfo { extension: "png", mime: "image/png" },
        () if fmt.contains("gif") => FormatInfo { extension: "gif", mime: "image/gif" },
        () if fmt.contains("webp") => FormatInfo { extension: "webp", mime: "image/webp" },
        () if fmt.contains("svg") => FormatInfo { extension: "svg", mime: "image/svg+xml" },
        () if fmt.contains("mp4") => FormatInfo { extension: "mp4", mime: "video/mp4" },
        () if fmt.contains("pdf") => FormatInfo { extension: "pdf", mime: "application/pdf" },
        () => FormatInfo { extension: "bin", mime: "application/octet-stream" },
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
