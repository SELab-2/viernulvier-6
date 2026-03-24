use std::pin::pin;

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

use crate::helper::{extract_source_id, flatten_single};
use crate::models::media::{ApiMediaGallery, ApiMediaItem};
use crate::models::space::ApiSpace;
use crate::models::{
    collection::ApiCollection, event::ApiEvent, hall::ApiHall, location::ApiLocation,
    production::ApiProduction,
};
use uuid::Uuid;

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

                let media_gallery = production.media_gallery.clone();
                let review_gallery = production.review_gallery.clone();
                let poster_gallery = production.poster_gallery.clone();

                self.db
                    .productions()
                    .insert(production.into())
                    .await
                    .unwrap();

                let Some(source_id) = production_source_id else {
                    continue;
                };

                // import all gallery types
                let galleries = [
                    (media_gallery, "media"),
                    (review_gallery, "review"),
                    (poster_gallery, "poster"),
                ];

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
                let production_id = match event.production_source_id() {
                    Some(id) => match self.db.productions().by_source_id(id).await.unwrap() {
                        Some(p) => p.id,
                        None => {
                            warn!("Events: production source_id {id} not found in db, skipping");
                            continue;
                        }
                    },
                    None => {
                        warn!("Events: event has no production source_id, skipping");
                        continue;
                    }
                };

                let hall_uuid = match event.hall_source_id() {
                    Some(id) => {
                        let uuid = self
                            .db
                            .halls()
                            .by_source_id(id)
                            .await
                            .unwrap()
                            .map(|h| h.id);
                        if uuid.is_none() {
                            warn!("Events: hall source_id {id} not found in db");
                        }
                        uuid
                    }
                    None => None,
                };

                let event_create = event.to_create(production_id, hall_uuid);
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

        let production = match self
            .db
            .productions()
            .by_source_id(production_source_id)
            .await
        {
            Ok(Some(p)) => p,
            _ => {
                warn!("Media: production source_id {production_source_id} not found");
                return Ok(());
            }
        };

        let mut count = 0;
        for item_url in &gallery.items {
            match self
                .import_media_item(item_url, production.id, production_source_id, gallery_type)
                .await
            {
                Ok(()) => count += 1,
                Err(e) => warn!("Media: failed to import item {item_url}: {e}"),
            }
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
        item_url: &str,
        production_id: Uuid,
        production_source_id: i32,
        gallery_type: &str,
    ) -> Result<(), reqwest::Error> {
        let url = format!("{BASE_URL}{item_url}");
        let item: ApiMediaItem = self
            .client
            .get(url)
            .header("X-AUTH-TOKEN", &self.auth_token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let source_id = extract_source_id(item_url);
        let title = flatten_single(Some(item.title));
        let description = flatten_single(Some(item.description));
        let credit = flatten_single(Some(item.credits));
        let mime_type = format_to_mime(&item.format);
        let cdn_url = flatten_single(Some(item.link));
        let now = Utc::now();

        // skip if already imported by source URI (stable idempotency)
        if self
            .db
            .media()
            .by_source_uri("viernulvier", item_url)
            .await
            .is_ok_and(|m| m.is_some())
        {
            return Ok(());
        }

        // importer policy: all imported media must be uploaded to S3; no external URL fallback
        let (Some(s3_client), Some(s3_bucket), Some(url)) =
            (&self.s3_client, &self.s3_bucket, &cdn_url)
        else {
            warn!(
                "Media: skipping import for {item_url} because S3 config or source URL is missing"
            );
            return Ok(());
        };

        let (s3_key, checksum, file_size) = match self
            .download_and_upload(
                s3_client,
                s3_bucket,
                url,
                production_source_id,
                gallery_type,
                &item.format,
            )
            .await
        {
            Ok(result) => result,
            Err(e) => {
                warn!("Media: download/upload failed for {url}: {e}");
                // return Ok so we continue to process the next items, it just won't be in the DB
                return Ok(());
            }
        };

        // store with s3_key
        let media_create = MediaCreate {
            s3_key,
            mime_type: mime_type.clone(),
            file_size: Some(file_size),
            width: Some(item.width as i32),
            height: Some(item.height as i32),
            checksum: Some(checksum),
            alt_text: title,
            description,
            credit,
            geo_latitude: None,
            geo_longitude: None,
            parent_id: None,
            derivative_type: None,
            gallery_type: Some(gallery_type.to_string()),
            source_id,
            source_system: "viernulvier".to_string(),
            source_uri: Some(item_url.to_string()),
            source_updated_at: Some(item.updated_at),
            created_at: now,
            updated_at: now,
        };

        if let Ok(media) = self.db.media().insert(media_create).await {
            let role = media_role_from_gallery_type(gallery_type);
            let is_cover = item.position == 0;
            let _ = self
                .db
                .media()
                .link_to_entity(
                    EntityType::Production,
                    production_id,
                    media.id,
                    role,
                    item.position as i32,
                    is_cover,
                )
                .await;

            // Note: We skip downloading the pre-calculated crop variants from the image proxy
            // to avoid extreme rate limits and massive storage duplication.
            // As an archive, we only store the original high-resolution image in S3,
            // and we rely on dynamic on-the-fly image resizing in our frontend or own proxy.
        }

        Ok(())
    }

    async fn download_and_upload(
        &self,
        s3_client: &aws_sdk_s3::Client,
        s3_bucket: &str,
        cdn_url: &str,
        production_source_id: i32,
        gallery_type: &str,
        format: &str,
    ) -> Result<(String, String, i64), String> {
        let ext = format.to_lowercase();
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
    ) -> Result<(String, i64), String> {
        // download from CDN
        let response = self
            .client
            .get(source_url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?;

        // Create a temporary file to avoid loading the whole file in memory
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join(format!("viernulvier_import_{}", Uuid::now_v7()));

        let mut file = tokio::fs::File::create(&temp_file_path)
            .await
            .map_err(|e| format!("failed to create temp file: {e}"))?;

        let mut hasher = Sha256::new();
        let mut file_size = 0i64;
        let mut stream = response.bytes_stream();

        use tokio::io::AsyncWriteExt;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("error downloading chunk: {e}"))?;
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("error writing chunk to temp file: {e}"))?;
            hasher.update(&chunk);
            file_size += chunk.len() as i64;
        }

        file.flush()
            .await
            .map_err(|e| format!("error flushing temp file: {e}"))?;
        let checksum = hex::encode(hasher.finalize());

        // upload to S3 using ByteStream from the temp file
        let byte_stream = aws_sdk_s3::primitives::ByteStream::from_path(&temp_file_path)
            .await
            .map_err(|e| format!("failed to create ByteStream from temp file: {e}"))?;

        let upload_result = s3_client
            .put_object()
            .bucket(s3_bucket)
            .key(s3_key)
            .body(byte_stream)
            .content_type(format_to_mime(format))
            .send()
            .await;

        // Clean up the temporary file
        let _ = tokio::fs::remove_file(&temp_file_path).await;

        match upload_result {
            Ok(_) => Ok((checksum, file_size)),
            Err(e) => {
                warn!("S3 upload failed for {s3_key}: {e:?}");
                Err(format!("s3 upload failed: {e}"))
            }
        }
    }
}

fn format_to_mime(format: &str) -> String {
    match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn media_role_from_gallery_type(gallery_type: &str) -> &str {
    match gallery_type {
        "media" => "gallery",
        "poster" => "poster",
        "review" => "review",
        other => other,
    }
}
