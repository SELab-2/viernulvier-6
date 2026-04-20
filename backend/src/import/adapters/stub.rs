use crate::import::trait_def::ImportableEntity;
use crate::import::types::{FieldSpec, RawRow, ReferenceResolution, ResolvedRow};
use async_trait::async_trait;
use database::Database;
use database::models::import_row::{DiffEntry, ImportWarning};
use sqlx::{Postgres, Transaction};
use std::collections::BTreeMap;
use uuid::Uuid;

/// Placeholder adapter for entity types not yet supported.
/// Every trait method returns `anyhow::bail!("entity type not yet supported")`.
pub struct StubAdapter {
    entity_type_name: &'static str,
}

impl StubAdapter {
    pub const fn new(entity_type_name: &'static str) -> Self {
        Self { entity_type_name }
    }
}

#[async_trait]
impl ImportableEntity for StubAdapter {
    fn entity_type(&self) -> &'static str {
        self.entity_type_name
    }

    fn target_fields(&self) -> Vec<FieldSpec> {
        vec![]
    }

    async fn lookup_existing(
        &self,
        _row: &ResolvedRow,
        _db: &Database,
    ) -> anyhow::Result<Option<Uuid>> {
        anyhow::bail!("entity type '{}' not yet supported", self.entity_type_name)
    }

    async fn resolve_references(
        &self,
        _row: &RawRow,
        _db: &Database,
    ) -> anyhow::Result<ReferenceResolution> {
        anyhow::bail!("entity type '{}' not yet supported", self.entity_type_name)
    }

    fn validate_row(&self, _row: &ResolvedRow) -> Vec<ImportWarning> {
        vec![ImportWarning {
            field: None,
            code: "not_supported".to_string(),
            message: format!("entity type '{}' not yet supported", self.entity_type_name),
        }]
    }

    async fn build_diff(
        &self,
        _entity_id: Uuid,
        _row: &ResolvedRow,
        _db: &Database,
    ) -> anyhow::Result<BTreeMap<String, DiffEntry>> {
        anyhow::bail!("entity type '{}' not yet supported", self.entity_type_name)
    }

    async fn apply_row(
        &self,
        _existing_id: Option<Uuid>,
        _row: &ResolvedRow,
        _db: &Database,
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid> {
        anyhow::bail!("entity type '{}' not yet supported", self.entity_type_name)
    }

    async fn revert_row(
        &self,
        _entity_id: Uuid,
        _db: &Database,
        _tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()> {
        anyhow::bail!("entity type '{}' not yet supported", self.entity_type_name)
    }
}
