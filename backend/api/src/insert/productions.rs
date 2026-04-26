use database::Database;

use crate::{
    error::{ImportEntity, ImportItemError},
    helper::extract_source_id,
    models::production::{ApiProduction, ProductionImportData},
};

impl ApiProduction {
    pub async fn upsert_import(self, db: &Database) -> Result<Option<i32>, ImportItemError> {
        let source_id = extract_source_id(&self.id);
        let data: ProductionImportData = self.into();

        db.productions()
            .upsert_by_source_id(data.production, data.translations)
            .await
            .map_err(|err| {
                ImportItemError::database_write(ImportEntity::Production, source_id, err)
            })?;

        Ok(source_id)
    }
}
