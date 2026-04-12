use database::{Database, error::DatabaseError};

use crate::models::production::{ApiProduction, ProductionImportData};

impl ApiProduction {
    /// returns the 404 API source_id so the live importer can drive per-production
    /// gallery fetches. seed binary ignores this.
    pub async fn insert(self, db: &Database) -> Result<Option<i32>, DatabaseError> {
        let source_id = self
            .id
            .split('/')
            .next_back()
            .and_then(|s| s.parse::<i32>().ok());

        let data: ProductionImportData = self.into();
        db.productions()
            .insert(data.production, data.translations)
            .await?;

        Ok(source_id)
    }
}
