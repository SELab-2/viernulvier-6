use database::Database;

use crate::{
    error::{ImportEntity, ImportItemError},
    helper::extract_source_id,
    models::location::ApiLocation,
};

impl ApiLocation {
    pub async fn upsert_import(self, db: &Database) -> Result<Option<i32>, ImportItemError> {
        let source_id = extract_source_id(&self.id);

        db.locations()
            .upsert_by_source_id(self.into())
            .await
            .map_err(|err| {
                ImportItemError::database_write(ImportEntity::Location, source_id, err)
            })?;

        Ok(source_id)
    }
}
