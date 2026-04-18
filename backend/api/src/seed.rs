use std::fs;
use std::path::PathBuf;

use database::{Database, error::DatabaseError};
use serde::Deserialize;
use thiserror::Error;
use tracing::{info, warn};

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
        self.apply_space_location_patches().await?;
        self.apply_hall_merges().await?;
        self.apply_hall_name_patches().await?;
        self.apply_hall_expansions().await?;
        self.apply_hall_deletions().await?;
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

    async fn import_locations(&self) -> Result<(), SeedError> {
        let items: Vec<ApiLocation> = self.read_file("locations.json")?;
        info!("Seed: importing {} locations", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_spaces(&self) -> Result<(), SeedError> {
        let items: Vec<ApiSpace> = self.read_file("spaces.json")?;
        info!("Seed: importing {} spaces", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_halls(&self) -> Result<(), SeedError> {
        let items: Vec<ApiHall> = self.read_file("halls.json")?;
        info!("Seed: importing {} halls", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_productions(&self) -> Result<(), SeedError> {
        let items: Vec<ApiProduction> = self.read_file("productions.json")?;
        info!("Seed: importing {} productions", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_prices(&self) -> Result<(), SeedError> {
        let items: Vec<ApiPrice> = self.read_file("prices.json")?;
        info!("Seed: importing {} prices", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_price_ranks(&self) -> Result<(), SeedError> {
        let items: Vec<ApiPriceRank> = self.read_file("price_ranks.json")?;
        info!("Seed: importing {} price ranks", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_events(&self) -> Result<(), SeedError> {
        let items: Vec<ApiEvent> = self.read_file("events.json")?;
        info!("Seed: importing {} events", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }

    async fn import_event_prices(&self) -> Result<(), SeedError> {
        let items: Vec<ApiEventPrice> = self.read_file("event_prices.json")?;
        info!("Seed: importing {} event prices", items.len());
        for item in items {
            item.insert(&self.db).await?;
        }
        Ok(())
    }
}
