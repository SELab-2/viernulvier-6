use database::{Database, error::DatabaseError};

use crate::models::production::{ApiProduction, ProductionImportData};

/// Inserts a production + translations.
///
/// Returns the 404 API source_id so the live importer can drive per-production
/// gallery fetches. The seed binary ignores this.
pub async fn insert_production(
    db: &Database,
    production: ApiProduction,
) -> Result<Option<i32>, DatabaseError> {
    let source_id = production
        .id
        .split('/')
        .next_back()
        .and_then(|s| s.parse::<i32>().ok());

    let data: ProductionImportData = production.into();
    db.productions()
        .insert(data.production, data.translations)
        .await?;

    Ok(source_id)
}
