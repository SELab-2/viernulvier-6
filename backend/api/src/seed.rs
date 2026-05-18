use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use aws_sdk_s3::config::{Builder as S3Builder, Credentials, Region};
use database::{Database, error::DatabaseError};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use thiserror::Error;
use tracing::{info, warn};

use crate::error::ImportItemError;
use crate::helper::extract_source_id;
use crate::models::{
    event::ApiEvent,
    event_price::ApiEventPrice,
    event_status::ApiEventStatus,
    hall::ApiHall,
    location::ApiLocation,
    price::ApiPrice,
    price_rank::ApiPriceRank,
    production::ApiProduction,
    space::ApiSpace,
};

#[derive(Debug, Error)]
pub enum SeedError {
    #[error("IO error reading seed file: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON parse error in seed file: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Database error during seed import: {0}")]
    Db(#[from] DatabaseError),
    #[error("Import error during seed: {0}")]
    Import(#[from] ImportItemError),
    #[error("S3 error uploading seed image: {0}")]
    S3(String),
}

#[derive(Deserialize)]
struct SeedManifest {
    max_updated_at: Option<String>,
}

#[derive(Deserialize)]
struct LocationNamePatch {
    source_id: i32,
    name: String,
}

#[derive(Deserialize)]
struct LocationCreation {
    name: String,
    slug: String,
    city: Option<String>,
    street: Option<String>,
    number: Option<String>,
    postal_code: Option<String>,
    country: Option<String>,
    #[serde(default)]
    space_source_ids: Vec<i32>,
}

#[derive(Deserialize)]
struct LocationDeletion {
    source_id: i32,
}

#[derive(Deserialize)]
struct SpaceLocationPatch {
    source_id: i32,
    location_source_id: i32,
}

#[derive(Deserialize)]
struct HallMerge {
    keep_source_id: i32,
    remove_source_id: i32,
}

#[derive(Deserialize)]
struct HallNamePatch {
    source_id: i32,
    name: String,
}

#[derive(Deserialize)]
struct HallDeletion {
    source_id: i32,
}

#[derive(Deserialize)]
struct HallExpansion {
    combo_source_id: i32,
    component_source_ids: Vec<i32>,
}

#[derive(Deserialize)]
struct GenreTagMapping {
    genre_source_id: i32,
    tag_slug: String,
    facet: String,
}

#[derive(Deserialize)]
struct UitdatabankThemeMapping {
    theme_source_id: i32,
    tag_slug: String,
    facet: String,
}

#[derive(Deserialize)]
struct GenreSeriesMapping {
    genre_source_id: i32,
    series_slug: String,
    name_nl: String,
    name_en: String,
}

#[derive(Deserialize)]
struct GenreLocationMapping {
    genre_source_id: i32,
    location_source_id: Option<i32>,
    location_slug: Option<String>,
}

#[derive(Deserialize)]
struct ProductionCorrection {
    source_id: i32,
    title_nl: Option<String>,
    title_en: Option<String>,
    artist_nl: Option<String>,
    artist_en: Option<String>,
}

#[derive(Deserialize)]
struct ArtistMerge {
    keep_slug: String,
    remove_slug: String,
}

#[derive(Deserialize)]
struct ArtistNamePatch {
    slug: String,
    name: String,
}

#[derive(Deserialize)]
struct LocationImagePatch {
    source_id: Option<i32>,
    slug: Option<String>,
    file: String,
    #[serde(default = "default_cover_role")]
    role: String,
    alt_text_nl: Option<String>,
    alt_text_en: Option<String>,
    credit: Option<String>,
}

#[derive(Deserialize)]
struct ArtistImagePatch {
    slug: String,
    file: String,
    #[serde(default = "default_cover_role")]
    role: String,
    alt_text_nl: Option<String>,
    alt_text_en: Option<String>,
    credit: Option<String>,
}

#[derive(Deserialize)]
struct ArticleImagePatch {
    slug: String,
    file: String,
    #[serde(default = "default_cover_role")]
    role: String,
    alt_text_nl: Option<String>,
    alt_text_en: Option<String>,
    credit: Option<String>,
}

fn default_cover_role() -> String {
    "cover".to_string()
}

/// Imports entities from local seed JSON files produced by `fetch_404`.
///
/// Constructed via [`SeedImporter::from_env`]; returns `None` when no seed
/// directory is configured or the manifest is absent, so callers can treat it
/// as opt-in without any special-casing.
pub struct SeedImporter {
    db: Database,
    seed_dir: PathBuf,
    s3_client: Option<aws_sdk_s3::Client>,
    s3_bucket: Option<String>,
}

impl SeedImporter {
    /// Locates the seed directory, falling back to `seed/raw` relative to the
    /// working directory. `SEED_RAW_DIR` overrides the default if set.
    /// Returns `None` if no manifest is found (seed import is silently skipped).
    pub fn from_env(db: Database) -> Option<Self> {
        let seed_dir = std::env::var("SEED_RAW_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("seed/raw"));

        if !seed_dir.join("manifest.json").exists() {
            return None;
        }

        let (s3_client, s3_bucket) = match (
            std::env::var("S3_ENDPOINT"),
            std::env::var("S3_ACCESS_KEY"),
            std::env::var("S3_SECRET_KEY"),
            std::env::var("S3_BUCKET"),
        ) {
            (Ok(endpoint), Ok(access_key), Ok(secret_key), Ok(bucket)) => {
                let region = std::env::var("S3_REGION").unwrap_or_else(|_| "garage".to_string());
                let creds = Credentials::new(&access_key, &secret_key, None, None, "seed");
                let s3_conf = S3Builder::new()
                    .region(Region::new(region))
                    .endpoint_url(&endpoint)
                    .credentials_provider(creds)
                    .force_path_style(true)
                    .request_checksum_calculation(
                        aws_sdk_s3::config::RequestChecksumCalculation::WhenRequired,
                    )
                    .response_checksum_validation(
                        aws_sdk_s3::config::ResponseChecksumValidation::WhenRequired,
                    )
                    .build();
                info!("SeedImporter: S3 configured, image patches enabled");
                (Some(aws_sdk_s3::Client::from_conf(s3_conf)), Some(bucket))
            }
            _ => {
                info!("SeedImporter: S3 not configured, image patches will be skipped");
                (None, None)
            }
        };

        Some(Self { db, seed_dir, s3_client, s3_bucket })
    }

    /// Returns `max_updated_at` from `manifest.json`, or `None` if absent or null.
    pub fn max_updated_at(&self) -> Option<String> {
        let raw = fs::read_to_string(self.seed_dir.join("manifest.json")).ok()?;
        let manifest: SeedManifest = serde_json::from_str(&raw).ok()?;
        manifest.max_updated_at
    }

    /// Imports all seeded entity types in dependency order, then applies
    /// normalization patches from `seed/normalization/`.
    pub async fn import_all(&self) -> Result<(), SeedError> {
        self.import_locations().await?;
        self.import_spaces().await?;
        self.import_halls().await?;
        self.import_productions().await?;
        self.apply_production_corrections().await?;
        self.import_prices().await?;
        self.import_price_ranks().await?;
        self.import_events().await?;
        self.import_event_prices().await?;
        self.apply_location_name_patches().await?;
        self.apply_location_creations().await?;
        self.apply_space_location_patches().await?;
        self.apply_location_deletions().await?;
        self.derive_location_slugs().await?;
        self.apply_hall_merges().await?;
        self.apply_hall_name_patches().await?;
        self.apply_hall_expansions().await?;
        self.apply_hall_deletions().await?;
        self.apply_genre_tag_mappings().await?;
        self.apply_uitdatabank_theme_mappings().await?;
        self.apply_genre_location_mappings().await?;
        self.apply_genre_series_mappings().await?;
        self.import_artists().await?;
        self.apply_artist_merges().await?;
        self.apply_artist_name_patches().await?;
        self.apply_location_image_patches().await?;
        self.apply_artist_image_patches().await?;
        self.apply_article_image_patches().await?;
        Ok(())
    }

    fn read_file<T: serde::de::DeserializeOwned>(
        &self,
        filename: &str,
    ) -> Result<Vec<T>, SeedError> {
        let raw = fs::read_to_string(self.seed_dir.join(filename))?;
        Ok(serde_json::from_str(&raw)?)
    }

    fn normalization_dir(&self) -> PathBuf {
        self.seed_dir
            .parent()
            .unwrap_or(&self.seed_dir)
            .join("normalization")
    }

    fn seed_root(&self) -> &Path {
        self.seed_dir.parent().unwrap_or(&self.seed_dir)
    }

    fn read_normalization_file<T: serde::de::DeserializeOwned>(
        &self,
        filename: &str,
    ) -> Option<Vec<T>> {
        let path = self.normalization_dir().join(filename);
        let raw = fs::read_to_string(&path)
            .map_err(|e| warn!("normalization file {filename} not found, skipping: {e}"))
            .ok()?;
        serde_json::from_str(&raw)
            .map_err(|e| warn!("failed to parse normalization file {filename}: {e}"))
            .ok()
    }

    async fn apply_production_corrections(&self) -> Result<(), SeedError> {
        let Some(corrections) = self
            .read_normalization_file::<ProductionCorrection>("productions/production_corrections.json")
        else {
            return Ok(());
        };

        info!("Applying {} production corrections", corrections.len());
        for c in corrections {
            for (lang, new_title, new_artist) in [
                ("nl", c.title_nl.as_deref(), c.artist_nl.as_deref()),
                ("en", c.title_en.as_deref(), c.artist_en.as_deref()),
            ] {
                if new_title.is_none() && new_artist.is_none() {
                    continue;
                }
                sqlx::query(
                    "UPDATE production_translations
                     SET title  = COALESCE($1, title),
                         artist = COALESCE($2, artist)
                     WHERE production_id = (SELECT id FROM productions WHERE source_id = $3)
                       AND language_code = $4",
                )
                .bind(new_title)
                .bind(new_artist)
                .bind(c.source_id)
                .bind(lang)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
            }
        }
        Ok(())
    }

    async fn apply_location_name_patches(&self) -> Result<(), SeedError> {
        let Some(patches) = self.read_normalization_file::<LocationNamePatch>("locations/location_names.json")
        else {
            return Ok(());
        };

        info!("Applying {} location name patches", patches.len());
        for patch in patches {
            sqlx::query(
                "UPDATE locations SET name = $1 WHERE source_id = $2",
            )
            .bind(&patch.name)
            .bind(patch.source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn apply_space_location_patches(&self) -> Result<(), SeedError> {
        let Some(patches) =
            self.read_normalization_file::<SpaceLocationPatch>("locations/space_locations.json")
        else {
            return Ok(());
        };

        info!("Applying {} space location patches", patches.len());
        for patch in patches {
            let rows = sqlx::query(
                "UPDATE spaces
                 SET location_id = (SELECT id FROM locations WHERE source_id = $1)
                 WHERE source_id = $2",
            )
            .bind(patch.location_source_id)
            .bind(patch.source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?
            .rows_affected();

            if rows == 0 {
                warn!(
                    space_source_id = patch.source_id,
                    location_source_id = patch.location_source_id,
                    "space location patch matched no rows"
                );
            }
        }
        Ok(())
    }

    async fn apply_location_creations(&self) -> Result<(), SeedError> {
        let Some(creations) =
            self.read_normalization_file::<LocationCreation>("locations/location_creations.json")
        else {
            return Ok(());
        };

        info!("Applying {} location creations", creations.len());
        for creation in creations {
            let location_id: uuid::Uuid = sqlx::query_scalar(
                "INSERT INTO locations (name, slug, city, street, number, postal_code, country)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id",
            )
            .bind(&creation.name)
            .bind(&creation.slug)
            .bind(&creation.city)
            .bind(&creation.street)
            .bind(&creation.number)
            .bind(&creation.postal_code)
            .bind(&creation.country)
            .fetch_one(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            for space_source_id in &creation.space_source_ids {
                sqlx::query(
                    "UPDATE spaces SET location_id = $1 WHERE source_id = $2",
                )
                .bind(location_id)
                .bind(space_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
            }
        }
        Ok(())
    }

    async fn apply_location_deletions(&self) -> Result<(), SeedError> {
        let Some(deletions) =
            self.read_normalization_file::<LocationDeletion>("locations/location_deletions.json")
        else {
            return Ok(());
        };

        info!("Applying {} location deletions", deletions.len());
        for deletion in deletions {
            sqlx::query("DELETE FROM locations WHERE source_id = $1")
                .bind(deletion.source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn derive_location_slugs(&self) -> Result<(), SeedError> {
        let rows: Vec<(uuid::Uuid, Option<String>)> = sqlx::query_as(
            "SELECT id, name FROM locations WHERE slug IS NULL ORDER BY id",
        )
        .fetch_all(self.db.pool())
        .await
        .map_err(DatabaseError::from)?;

        info!("Deriving slugs for {} locations without a slug", rows.len());

        let mut used: std::collections::HashSet<String> = sqlx::query_scalar(
            "SELECT slug FROM locations WHERE slug IS NOT NULL",
        )
        .fetch_all(self.db.pool())
        .await
        .map_err(DatabaseError::from)?
        .into_iter()
        .collect();

        for (id, name) in rows {
            let name = name.unwrap_or_default();
            let base = slug::slugify(&name);
            if base.is_empty() {
                warn!(location_id = %id, "derive_location_slugs: could not derive slug from name {:?}, skipping", name);
                continue;
            }

            let slug = if !used.contains(&base) {
                base.clone()
            } else {
                let mut n = 2u32;
                loop {
                    let candidate = format!("{}-{}", base, n);
                    if !used.contains(&candidate) {
                        break candidate;
                    }
                    n += 1;
                }
            };

            used.insert(slug.clone());

            sqlx::query("UPDATE locations SET slug = $1 WHERE id = $2")
                .bind(&slug)
                .bind(id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }

        Ok(())
    }

    async fn apply_hall_merges(&self) -> Result<(), SeedError> {
        let Some(merges) = self.read_normalization_file::<HallMerge>("halls/hall_merges.json") else {
            return Ok(());
        };

        info!("Applying {} hall merges", merges.len());
        for merge in merges {
            let keep_exists = sqlx::query("SELECT 1 FROM halls WHERE source_id = $1")
                .bind(merge.keep_source_id)
                .fetch_optional(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .is_some();

            let remove_exists = sqlx::query("SELECT 1 FROM halls WHERE source_id = $1")
                .bind(merge.remove_source_id)
                .fetch_optional(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .is_some();

            if !keep_exists || !remove_exists {
                warn!(
                    keep_source_id = merge.keep_source_id,
                    remove_source_id = merge.remove_source_id,
                    keep_exists,
                    remove_exists,
                    "hall merge skipped: referenced hall not found"
                );
                continue;
            }

            sqlx::query(
                "INSERT INTO event_halls (event_id, hall_id)
                 SELECT event_id, (SELECT id FROM halls WHERE source_id = $1)
                 FROM event_halls
                 WHERE hall_id = (SELECT id FROM halls WHERE source_id = $2)
                 ON CONFLICT DO NOTHING",
            )
            .bind(merge.keep_source_id)
            .bind(merge.remove_source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query(
                "DELETE FROM event_halls
                 WHERE hall_id = (SELECT id FROM halls WHERE source_id = $1)",
            )
            .bind(merge.remove_source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query("DELETE FROM halls WHERE source_id = $1")
                .bind(merge.remove_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn apply_hall_name_patches(&self) -> Result<(), SeedError> {
        let Some(patches) = self.read_normalization_file::<HallNamePatch>("halls/hall_names.json") else {
            return Ok(());
        };

        info!("Applying {} hall name patches", patches.len());
        for patch in patches {
            sqlx::query("UPDATE halls SET name = $1 WHERE source_id = $2")
                .bind(&patch.name)
                .bind(patch.source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn apply_hall_expansions(&self) -> Result<(), SeedError> {
        let Some(expansions) =
            self.read_normalization_file::<HallExpansion>("halls/hall_expansions.json")
        else {
            return Ok(());
        };

        info!("Applying {} hall expansions", expansions.len());
        for expansion in expansions {
            let combo_exists = sqlx::query("SELECT 1 FROM halls WHERE source_id = $1")
                .bind(expansion.combo_source_id)
                .fetch_optional(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .is_some();

            if !combo_exists {
                warn!(
                    combo_source_id = expansion.combo_source_id,
                    "hall expansion skipped: combo hall not found"
                );
                continue;
            }

            let mut missing_components = false;
            for component_source_id in &expansion.component_source_ids {
                let exists = sqlx::query("SELECT 1 FROM halls WHERE source_id = $1")
                    .bind(component_source_id)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?
                    .is_some();
                if !exists {
                    warn!(
                        combo_source_id = expansion.combo_source_id,
                        component_source_id,
                        "hall expansion skipped: component hall not found"
                    );
                    missing_components = true;
                }
            }
            if missing_components {
                continue;
            }

            for component_source_id in &expansion.component_source_ids {
                sqlx::query(
                    "INSERT INTO event_halls (event_id, hall_id)
                     SELECT event_id, (SELECT id FROM halls WHERE source_id = $1)
                     FROM event_halls
                     WHERE hall_id = (SELECT id FROM halls WHERE source_id = $2)
                     ON CONFLICT DO NOTHING",
                )
                .bind(component_source_id)
                .bind(expansion.combo_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
            }

            sqlx::query(
                "DELETE FROM event_halls
                 WHERE hall_id = (SELECT id FROM halls WHERE source_id = $1)",
            )
            .bind(expansion.combo_source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query("DELETE FROM halls WHERE source_id = $1")
                .bind(expansion.combo_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn apply_hall_deletions(&self) -> Result<(), SeedError> {
        let Some(deletions) = self.read_normalization_file::<HallDeletion>("halls/hall_deletions.json")
        else {
            return Ok(());
        };

        info!("Applying {} hall deletions", deletions.len());
        for deletion in deletions {
            sqlx::query(
                "DELETE FROM event_halls
                 WHERE hall_id = (SELECT id FROM halls WHERE source_id = $1)",
            )
            .bind(deletion.source_id)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query("DELETE FROM halls WHERE source_id = $1")
                .bind(deletion.source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;
        }
        Ok(())
    }

    async fn apply_genre_tag_mappings(&self) -> Result<(), SeedError> {
        let Some(mappings) =
            self.read_normalization_file::<GenreTagMapping>("genres/genre_tag_mappings.json")
        else {
            return Ok(());
        };

        let index: HashMap<i32, (&str, &str)> = mappings
            .iter()
            .map(|m| (m.genre_source_id, (m.tag_slug.as_str(), m.facet.as_str())))
            .collect();

        let productions: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!(
            "Applying genre→tag mappings to {} productions",
            productions.len()
        );

        let mut count = 0u64;
        for prod in &productions {
            let Some(prod_source_id) = extract_source_id(&prod.id) else {
                continue;
            };
            for genre_url in &prod.genres {
                let Some(genre_source_id) = extract_source_id(genre_url) else {
                    continue;
                };
                let Some(&(tag_slug, facet)) = index.get(&genre_source_id) else {
                    continue;
                };
                let rows = sqlx::query(
                    "INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
                     SELECT t.id, 'production'::entity_type, p.id, false
                     FROM tags t
                     JOIN productions p ON p.source_id = $1
                     WHERE t.slug = $2 AND t.facet::text = $3
                     ON CONFLICT DO NOTHING",
                )
                .bind(prod_source_id)
                .bind(tag_slug)
                .bind(facet)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();
                count += rows;
            }
        }

        info!("Inserted {} genre→tag taggings", count);
        Ok(())
    }

    async fn apply_uitdatabank_theme_mappings(&self) -> Result<(), SeedError> {
        let Some(mappings) = self
            .read_normalization_file::<UitdatabankThemeMapping>("genres/uitdatabank_theme_mappings.json")
        else {
            return Ok(());
        };

        let index: HashMap<i32, (&str, &str)> = mappings
            .iter()
            .map(|m| (m.theme_source_id, (m.tag_slug.as_str(), m.facet.as_str())))
            .collect();

        let productions: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!(
            "Applying uitdatabank theme→tag mappings to {} productions",
            productions.len()
        );

        let mut count = 0u64;
        for prod in &productions {
            let Some(prod_source_id) = extract_source_id(&prod.id) else {
                continue;
            };
            let Some(theme_url) = &prod.uitdatabank_theme else {
                continue;
            };
            let Some(theme_source_id) = extract_source_id(theme_url) else {
                continue;
            };
            let Some(&(tag_slug, facet)) = index.get(&theme_source_id) else {
                continue;
            };
            let rows = sqlx::query(
                "INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
                 SELECT t.id, 'production'::entity_type, p.id, false
                 FROM tags t
                 JOIN productions p ON p.source_id = $1
                 WHERE t.slug = $2 AND t.facet::text = $3
                 ON CONFLICT DO NOTHING",
            )
            .bind(prod_source_id)
            .bind(tag_slug)
            .bind(facet)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?
            .rows_affected();
            count += rows;
        }

        info!("Inserted {} uitdatabank theme→tag taggings", count);
        Ok(())
    }

    async fn apply_genre_location_mappings(&self) -> Result<(), SeedError> {
        let Some(mappings) =
            self.read_normalization_file::<GenreLocationMapping>("genres/genre_location_mappings.json")
        else {
            return Ok(());
        };

        // pre-resolve location UUIDs
        let mut location_index: HashMap<i32, uuid::Uuid> = HashMap::new();
        for m in &mappings {
            let location_id: Option<uuid::Uuid> = if let Some(sid) = m.location_source_id {
                sqlx::query_scalar("SELECT id FROM locations WHERE source_id = $1")
                    .bind(sid)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?
            } else if let Some(slug) = &m.location_slug {
                sqlx::query_scalar("SELECT id FROM locations WHERE slug = $1")
                    .bind(slug)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?
            } else {
                None
            };

            if let Some(id) = location_id {
                location_index.insert(m.genre_source_id, id);
            } else {
                warn!(genre_source_id = m.genre_source_id, "genre_location_mapping: location not found, skipping");
            }
        }

        let productions: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!(
            "Applying genre→location mappings to {} productions",
            productions.len()
        );

        let mut count = 0u64;
        for prod in &productions {
            let Some(prod_source_id) = extract_source_id(&prod.id) else {
                continue;
            };
            for genre_url in &prod.genres {
                let Some(genre_source_id) = extract_source_id(genre_url) else {
                    continue;
                };
                let Some(&location_id) = location_index.get(&genre_source_id) else {
                    continue;
                };
                let rows = sqlx::query(
                    "INSERT INTO production_locations (production_id, location_id)
                     SELECT p.id, $1
                     FROM productions p
                     WHERE p.source_id = $2
                     ON CONFLICT DO NOTHING",
                )
                .bind(location_id)
                .bind(prod_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();
                count += rows;
            }
        }

        info!("Inserted {} genre→location links", count);
        Ok(())
    }

    async fn apply_genre_series_mappings(&self) -> Result<(), SeedError> {
        let Some(mappings) =
            self.read_normalization_file::<GenreSeriesMapping>("genres/genre_series_mappings.json")
        else {
            return Ok(());
        };

        // pre-resolve (upsert) series UUIDs
        let mut series_index: HashMap<i32, uuid::Uuid> = HashMap::new();
        for m in &mappings {
            let series_id: uuid::Uuid = sqlx::query_scalar(
                "INSERT INTO series (slug) VALUES ($1)
                 ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
                 RETURNING id",
            )
            .bind(&m.series_slug)
            .fetch_one(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query(
                "INSERT INTO series_translations (series_id, language_code, name)
                 VALUES ($1, 'nl', $2), ($1, 'en', $3)
                 ON CONFLICT (series_id, language_code) DO UPDATE SET name = EXCLUDED.name",
            )
            .bind(series_id)
            .bind(&m.name_nl)
            .bind(&m.name_en)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            series_index.insert(m.genre_source_id, series_id);
        }

        let productions: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!(
            "Applying genre→series mappings to {} productions",
            productions.len()
        );

        let mut count = 0u64;
        for prod in &productions {
            let Some(prod_source_id) = extract_source_id(&prod.id) else {
                continue;
            };
            for genre_url in &prod.genres {
                let Some(genre_source_id) = extract_source_id(genre_url) else {
                    continue;
                };
                let Some(&series_id) = series_index.get(&genre_source_id) else {
                    continue;
                };
                let rows = sqlx::query(
                    "INSERT INTO series_productions (series_id, production_id)
                     SELECT $1, p.id FROM productions p WHERE p.source_id = $2
                     ON CONFLICT DO NOTHING",
                )
                .bind(series_id)
                .bind(prod_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();
                count += rows;
            }
        }

        info!("Inserted {} genre→series links", count);
        Ok(())
    }

    async fn import_artists(&self) -> Result<(), SeedError> {
        let rows: Vec<(uuid::Uuid, Option<String>, Option<String>)> = sqlx::query_as(
            "SELECT p.id, nl.artist, en.artist
             FROM productions p
             LEFT JOIN production_translations nl
               ON nl.production_id = p.id AND nl.language_code = 'nl'
             LEFT JOIN production_translations en
               ON en.production_id = p.id AND en.language_code = 'en'",
        )
        .fetch_all(self.db.pool())
        .await
        .map_err(DatabaseError::from)?;

        info!("Seed: deriving artists from {} productions", rows.len());

        let mut link_count = 0u64;
        for (prod_id, nl_artist, en_artist) in rows {
            let Some(text) = nl_artist
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .or_else(|| en_artist.as_deref().filter(|s| !s.trim().is_empty()))
                .map(str::to_owned)
            else {
                continue;
            };
            for fragment in split_artist_field(&text) {
                let name = fragment.trim();
                if name.is_empty() {
                    continue;
                }
                let slug = slug::slugify(name);
                if slug.is_empty() {
                    continue;
                }
                let artist_id: uuid::Uuid = sqlx::query_scalar(
                    "INSERT INTO artists (name, slug) VALUES ($1, $2)
                     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
                     RETURNING id",
                )
                .bind(name)
                .bind(&slug)
                .fetch_one(self.db.pool())
                .await
                .map_err(DatabaseError::from)?;

                let inserted = sqlx::query(
                    "INSERT INTO production_artists (production_id, artist_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING",
                )
                .bind(prod_id)
                .bind(artist_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();

                link_count += inserted;
            }
        }

        info!("Seed: inserted {} production→artist links", link_count);
        Ok(())
    }

    async fn apply_artist_merges(&self) -> Result<(), SeedError> {
        let Some(merges) = self.read_normalization_file::<ArtistMerge>("artists/artist_merges.json") else {
            return Ok(());
        };

        info!("Applying {} artist merges", merges.len());
        for merge in &merges {
            sqlx::query(
                "INSERT INTO production_artists (production_id, artist_id)
                 SELECT pa.production_id, (SELECT id FROM artists WHERE slug = $1)
                 FROM production_artists pa
                 JOIN artists a ON a.id = pa.artist_id
                 WHERE a.slug = $2
                 ON CONFLICT DO NOTHING",
            )
            .bind(&merge.keep_slug)
            .bind(&merge.remove_slug)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            sqlx::query(
                "DELETE FROM production_artists
                 WHERE artist_id = (SELECT id FROM artists WHERE slug = $1)",
            )
            .bind(&merge.remove_slug)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;

            let rows = sqlx::query("DELETE FROM artists WHERE slug = $1")
                .bind(&merge.remove_slug)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();

            if rows == 0 {
                warn!(remove_slug = %merge.remove_slug, "artist merge: artist to remove not found");
            }
        }
        Ok(())
    }

    async fn apply_artist_name_patches(&self) -> Result<(), SeedError> {
        let Some(patches) =
            self.read_normalization_file::<ArtistNamePatch>("artists/artist_names.json")
        else {
            return Ok(());
        };

        info!("Applying {} artist name patches", patches.len());
        for patch in &patches {
            let rows = sqlx::query("UPDATE artists SET name = $1 WHERE slug = $2")
                .bind(&patch.name)
                .bind(&patch.slug)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();

            if rows == 0 {
                warn!(slug = %patch.slug, "artist name patch matched no rows");
            }
        }
        Ok(())
    }

    async fn apply_location_image_patches(&self) -> Result<(), SeedError> {
        let Some(s3_bucket) = &self.s3_bucket else {
            return Ok(());
        };
        let Some(patches) =
            self.read_normalization_file::<LocationImagePatch>("images/location_images.json")
        else {
            return Ok(());
        };

        let mut count = 0u32;
        info!("Applying {} location image patches", patches.len());
        for patch in &patches {
            let entity_id: Option<uuid::Uuid> = if let Some(sid) = patch.source_id {
                sqlx::query_scalar("SELECT id FROM locations WHERE source_id = $1")
                    .bind(sid)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?
            } else if let Some(slug) = &patch.slug {
                sqlx::query_scalar("SELECT id FROM locations WHERE slug = $1")
                    .bind(slug)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?
            } else {
                warn!(file = %patch.file, "location image patch: neither source_id nor slug provided, skipping");
                continue;
            };

            let Some(entity_id) = entity_id else {
                warn!(file = %patch.file, "location image patch: location not found, skipping");
                continue;
            };

            let file_path = self.seed_root().join(&patch.file);
            if !file_path.exists() {
                warn!(file = %patch.file, "location image patch: file not found, skipping");
                continue;
            }

            if let Err(e) = self
                .seed_entity_image(
                    "location",
                    entity_id,
                    &file_path,
                    &patch.role,
                    patch.alt_text_nl.as_deref(),
                    patch.alt_text_en.as_deref(),
                    patch.credit.as_deref(),
                    s3_bucket,
                )
                .await
            {
                warn!(file = %patch.file, error = %e, "location image patch: failed, skipping");
                continue;
            }
            count += 1;
        }
        info!("Applied {count} location image patches");
        Ok(())
    }

    async fn apply_artist_image_patches(&self) -> Result<(), SeedError> {
        let Some(s3_bucket) = &self.s3_bucket else {
            return Ok(());
        };
        let Some(patches) =
            self.read_normalization_file::<ArtistImagePatch>("images/artist_images.json")
        else {
            return Ok(());
        };

        let mut count = 0u32;
        info!("Applying {} artist image patches", patches.len());
        for patch in &patches {
            let entity_id: Option<uuid::Uuid> =
                sqlx::query_scalar("SELECT id FROM artists WHERE slug = $1")
                    .bind(&patch.slug)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?;

            let Some(entity_id) = entity_id else {
                warn!(slug = %patch.slug, "artist image patch: artist not found, skipping");
                continue;
            };

            let file_path = self.seed_root().join(&patch.file);
            if !file_path.exists() {
                warn!(file = %patch.file, "artist image patch: file not found, skipping");
                continue;
            }

            if let Err(e) = self
                .seed_entity_image(
                    "artist",
                    entity_id,
                    &file_path,
                    &patch.role,
                    patch.alt_text_nl.as_deref(),
                    patch.alt_text_en.as_deref(),
                    patch.credit.as_deref(),
                    s3_bucket,
                )
                .await
            {
                warn!(file = %patch.file, error = %e, "artist image patch: failed, skipping");
                continue;
            }
            count += 1;
        }
        info!("Applied {count} artist image patches");
        Ok(())
    }

    async fn apply_article_image_patches(&self) -> Result<(), SeedError> {
        let Some(s3_bucket) = &self.s3_bucket else {
            return Ok(());
        };
        let Some(patches) =
            self.read_normalization_file::<ArticleImagePatch>("images/article_images.json")
        else {
            return Ok(());
        };

        let mut count = 0u32;
        info!("Applying {} article image patches", patches.len());
        for patch in &patches {
            let entity_id: Option<uuid::Uuid> =
                sqlx::query_scalar("SELECT id FROM articles WHERE slug = $1")
                    .bind(&patch.slug)
                    .fetch_optional(self.db.pool())
                    .await
                    .map_err(DatabaseError::from)?;

            let Some(entity_id) = entity_id else {
                warn!(slug = %patch.slug, "article image patch: article not found, skipping");
                continue;
            };

            let file_path = self.seed_root().join(&patch.file);
            if !file_path.exists() {
                warn!(file = %patch.file, "article image patch: file not found, skipping");
                continue;
            }

            if let Err(e) = self
                .seed_entity_image(
                    "article",
                    entity_id,
                    &file_path,
                    &patch.role,
                    patch.alt_text_nl.as_deref(),
                    patch.alt_text_en.as_deref(),
                    patch.credit.as_deref(),
                    s3_bucket,
                )
                .await
            {
                warn!(file = %patch.file, error = %e, "article image patch: failed, skipping");
                continue;
            }
            count += 1;
        }
        info!("Applied {count} article image patches");
        Ok(())
    }

    async fn seed_entity_image(
        &self,
        entity_type: &str,
        entity_id: uuid::Uuid,
        file_path: &Path,
        role: &str,
        alt_text_nl: Option<&str>,
        alt_text_en: Option<&str>,
        credit: Option<&str>,
        s3_bucket: &str,
    ) -> Result<(), SeedError> {
        let file_name = file_path.to_str().unwrap_or("");
        let (ext, mime) = seed_ext_and_mime(file_name);
        let s3_key = format!("media/seed/{entity_type}/{entity_id}/{role}.{ext}");
        let source_uri = patch_source_uri(file_path);

        let (checksum, file_size, width, height) =
            self.upload_seed_image(file_path, &s3_key, mime, s3_bucket).await?;

        let is_cover = role == "cover";

        // Clear any existing cover for this entity+role before inserting, so the
        // cover unique index doesn't conflict if the image changed across re-seeds.
        if is_cover {
            sqlx::query(
                "UPDATE entity_media SET is_cover_image = false
                 WHERE entity_type = $1::entity_type AND entity_id = $2 AND role = $3
                   AND is_cover_image = true",
            )
            .bind(entity_type)
            .bind(entity_id)
            .bind(role)
            .execute(self.db.pool())
            .await
            .map_err(DatabaseError::from)?;
        }

        let media_id: uuid::Uuid = sqlx::query_scalar(
            "WITH ins AS (
                INSERT INTO media (s3_key, mime_type, file_size, width, height, checksum,
                                   alt_text_nl, alt_text_en, credit_nl,
                                   source_system, source_uri)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'seed', $10)
                ON CONFLICT (source_system, source_uri) WHERE source_uri IS NOT NULL DO NOTHING
                RETURNING id
             )
             SELECT id FROM ins
             UNION ALL
             SELECT id FROM media WHERE source_system = 'seed' AND source_uri = $10
             LIMIT 1",
        )
        .bind(&s3_key)
        .bind(mime)
        .bind(file_size)
        .bind(width)
        .bind(height)
        .bind(&checksum)
        .bind(alt_text_nl)
        .bind(alt_text_en)
        .bind(credit)
        .bind(&source_uri)
        .fetch_one(self.db.pool())
        .await
        .map_err(DatabaseError::from)?;

        sqlx::query(
            "INSERT INTO entity_media (entity_type, entity_id, media_id, role, sort_order, is_cover_image)
             VALUES ($1::entity_type, $2, $3, $4, 0, $5)
             ON CONFLICT (entity_type, entity_id, media_id)
             DO UPDATE SET role = EXCLUDED.role, is_cover_image = EXCLUDED.is_cover_image",
        )
        .bind(entity_type)
        .bind(entity_id)
        .bind(media_id)
        .bind(role)
        .bind(is_cover)
        .execute(self.db.pool())
        .await
        .map_err(DatabaseError::from)?;

        Ok(())
    }

    async fn upload_seed_image(
        &self,
        file_path: &Path,
        s3_key: &str,
        mime: &str,
        s3_bucket: &str,
    ) -> Result<(String, i64, Option<i32>, Option<i32>), SeedError> {
        let bytes = fs::read(file_path)?;
        let file_size = bytes.len() as i64;

        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let checksum = hex::encode(hasher.finalize());

        let (width, height) = imagesize::size(file_path)
            .map_or((None, None), |d| (Some(d.width as i32), Some(d.height as i32)));

        let s3_client = self.s3_client.as_ref().unwrap();
        let byte_stream = aws_sdk_s3::primitives::ByteStream::from(bytes);

        s3_client
            .put_object()
            .bucket(s3_bucket)
            .key(s3_key)
            .body(byte_stream)
            .content_type(mime)
            .send()
            .await
            .map_err(|e| SeedError::S3(e.to_string()))?;

        Ok((checksum, file_size, width, height))
    }

    async fn import_locations(&self) -> Result<(), SeedError> {
        let items: Vec<ApiLocation> = self.read_file("locations.json")?;
        info!("Seed: importing {} locations", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_spaces(&self) -> Result<(), SeedError> {
        let items: Vec<ApiSpace> = self.read_file("spaces.json")?;
        info!("Seed: importing {} spaces", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_halls(&self) -> Result<(), SeedError> {
        let items: Vec<ApiHall> = self.read_file("halls.json")?;
        info!("Seed: importing {} halls", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_productions(&self) -> Result<(), SeedError> {
        let items: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!("Seed: importing {} productions", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_prices(&self) -> Result<(), SeedError> {
        let items: Vec<ApiPrice> = self.read_file("prices.json")?;
        info!("Seed: importing {} prices", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_price_ranks(&self) -> Result<(), SeedError> {
        let items: Vec<ApiPriceRank> = self.read_file("price_ranks.json")?;
        info!("Seed: importing {} price ranks", items.len());
        for item in items {
            item.upsert_import(&self.db).await?;
        }
        Ok(())
    }

    async fn import_events(&self) -> Result<(), SeedError> {
        let statuses: Vec<ApiEventStatus> = self.read_file("event_statuses.json")?;
        let status_map: HashMap<String, String> =
            statuses.into_iter().map(|s| (s.id.clone(), s.display())).collect();

        let items: Vec<ApiEvent> = self.read_file("events.json")?;
        info!("Seed: importing {} events", items.len());
        let mut skipped = 0u32;
        for item in items {
            if let Err(err) = item.upsert_import(&self.db, &status_map).await {
                warn!(error = %err, "skipping event during seed import");
                skipped += 1;
            }
        }
        if skipped > 0 {
            warn!("Seed: skipped {skipped} events (likely reference LongtermProduction records not in seed)");
        }
        Ok(())
    }

    async fn import_event_prices(&self) -> Result<(), SeedError> {
        let items: Vec<ApiEventPrice> = self.read_file("event_prices.json")?;
        info!("Seed: importing {} event prices", items.len());
        let mut skipped = 0u32;
        for item in items {
            if let Err(err) = item.upsert_import(&self.db).await {
                warn!(error = %err, "skipping event price during seed import");
                skipped += 1;
            }
        }
        if skipped > 0 {
            warn!("Seed: skipped {skipped} event prices (their event was not imported)");
        }
        Ok(())
    }
}

fn seed_ext_and_mime(file_path: &str) -> (&'static str, &'static str) {
    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => ("jpg", "image/jpeg"),
        "png" => ("png", "image/png"),
        "webp" => ("webp", "image/webp"),
        "gif" => ("gif", "image/gif"),
        "svg" => ("svg", "image/svg+xml"),
        _ => ("jpg", "image/jpeg"),
    }
}

fn patch_source_uri(file_path: &Path) -> String {
    file_path
        .to_str()
        .map(|s| s.replace('\\', "/"))
        .unwrap_or_default()
}

/// Split an artist field on `/`, `&`, `|`, and `,`, but not when inside
/// single or double quotes — so names like `'hi, paris'` stay intact.
fn split_artist_field(text: &str) -> Vec<&str> {
    let mut parts = Vec::new();
    let mut start = 0;
    let mut in_single = false;
    let mut in_double = false;
    let bytes = text.as_bytes();
    let mut i = 0;

    while i < bytes.len() {
        match bytes[i] {
            b'\'' if !in_double => in_single = !in_single,
            b'"' if !in_single => in_double = !in_double,
            b'/' | b'&' | b'|' | b',' if !in_single && !in_double => {
                parts.push(&text[start..i]);
                start = i + 1;
            }
            _ => {}
        }
        i += 1;
    }
    parts.push(&text[start..]);
    parts
}
