use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use database::{Database, error::DatabaseError};
use serde::Deserialize;
use thiserror::Error;
use tracing::{info, warn};

use crate::error::ImportItemError;
use crate::helper::extract_source_id;
use crate::models::{
    event::ApiEvent,
    event_price::ApiEventPrice,
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
struct ArtistMerge {
    keep_slug: String,
    remove_slug: String,
}

#[derive(Deserialize)]
struct ArtistNamePatch {
    slug: String,
    name: String,
}

/// Imports entities from local seed JSON files produced by `fetch_404`.
///
/// Constructed via [`SeedImporter::from_env`]; returns `None` when no seed
/// directory is configured or the manifest is absent, so callers can treat it
/// as opt-in without any special-casing.
pub struct SeedImporter {
    db: Database,
    seed_dir: PathBuf,
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

        Some(Self { db, seed_dir })
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
        self.import_prices().await?;
        self.import_price_ranks().await?;
        self.import_events().await?;
        self.import_event_prices().await?;
        self.apply_location_name_patches().await?;
        self.apply_location_creations().await?;
        self.apply_space_location_patches().await?;
        self.apply_location_deletions().await?;
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

    async fn apply_location_name_patches(&self) -> Result<(), SeedError> {
        let Some(patches) = self.read_normalization_file::<LocationNamePatch>("location_names.json")
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
            self.read_normalization_file::<SpaceLocationPatch>("space_locations.json")
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
            self.read_normalization_file::<LocationCreation>("location_creations.json")
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
            self.read_normalization_file::<LocationDeletion>("location_deletions.json")
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

    async fn apply_hall_merges(&self) -> Result<(), SeedError> {
        let Some(merges) = self.read_normalization_file::<HallMerge>("hall_merges.json") else {
            return Ok(());
        };

        info!("Applying {} hall merges", merges.len());
        for merge in merges {
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

            let rows = sqlx::query("DELETE FROM halls WHERE source_id = $1")
                .bind(merge.remove_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();

            if rows == 0 {
                warn!(
                    remove_source_id = merge.remove_source_id,
                    "hall merge: hall to remove not found"
                );
            }
        }
        Ok(())
    }

    async fn apply_hall_name_patches(&self) -> Result<(), SeedError> {
        let Some(patches) = self.read_normalization_file::<HallNamePatch>("hall_names.json") else {
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
            self.read_normalization_file::<HallExpansion>("hall_expansions.json")
        else {
            return Ok(());
        };

        info!("Applying {} hall expansions", expansions.len());
        for expansion in expansions {
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

            let rows = sqlx::query("DELETE FROM halls WHERE source_id = $1")
                .bind(expansion.combo_source_id)
                .execute(self.db.pool())
                .await
                .map_err(DatabaseError::from)?
                .rows_affected();

            if rows == 0 {
                warn!(
                    combo_source_id = expansion.combo_source_id,
                    "hall expansion: combo hall not found"
                );
            }
        }
        Ok(())
    }

    async fn apply_hall_deletions(&self) -> Result<(), SeedError> {
        let Some(deletions) = self.read_normalization_file::<HallDeletion>("hall_deletions.json")
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
            self.read_normalization_file::<GenreTagMapping>("genre_tag_mappings.json")
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
            .read_normalization_file::<UitdatabankThemeMapping>("uitdatabank_theme_mappings.json")
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
            self.read_normalization_file::<GenreLocationMapping>("genre_location_mappings.json")
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

            match location_id {
                Some(id) => { location_index.insert(m.genre_source_id, id); }
                None => warn!(genre_source_id = m.genre_source_id, "genre_location_mapping: location not found, skipping"),
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
            self.read_normalization_file::<GenreSeriesMapping>("genre_series_mappings.json")
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
            let Some(text) = nl_artist.or(en_artist) else {
                continue;
            };
            for fragment in text.split('/') {
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
        let Some(merges) = self.read_normalization_file::<ArtistMerge>("artist_merges.json") else {
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
            self.read_normalization_file::<ArtistNamePatch>("artist_names.json")
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
        let items: Vec<ApiEvent> = self.read_file("events.json")?;
        info!("Seed: importing {} events", items.len());
        let mut skipped = 0u32;
        for item in items {
            if let Err(err) = item.upsert_import(&self.db).await {
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
