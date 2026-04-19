use async_trait::async_trait;
use database::{
    Database,
    models::import_row::{DiffEntry, ImportWarning},
};
use sqlx::{Postgres, Transaction};
use std::collections::BTreeMap;
use uuid::Uuid;

use crate::import::types::{FieldSpec, RawRow, ReferenceResolution, ResolvedRow};

#[async_trait]
pub trait ImportableEntity: Send + Sync {
    fn entity_type(&self) -> &'static str;
    fn target_fields(&self) -> Vec<FieldSpec>;

    async fn lookup_existing(
        &self,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<Option<Uuid>>;

    async fn resolve_references(
        &self,
        row: &RawRow,
        db: &Database,
    ) -> anyhow::Result<ReferenceResolution>;

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning>;

    async fn build_diff(
        &self,
        entity_id: Uuid,
        row: &ResolvedRow,
        db: &Database,
    ) -> anyhow::Result<BTreeMap<String, DiffEntry>>;

    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid>;

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()>;
}
