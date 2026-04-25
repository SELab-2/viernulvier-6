use database::Database;

use crate::{
    error::{ImportEntity, ImportField, ImportItemError, ImportRelation},
    helper::extract_source_id,
    models::space::ApiSpace,
};

impl ApiSpace {
    pub async fn upsert_import(self, db: &Database) -> Result<Option<i32>, ImportItemError> {
        let source_id = extract_source_id(&self.id);

        let Some(location_source_id) = extract_source_id(&self.location) else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::Space,
                ImportField::Location,
                &self.location,
            ));
        };

        let location = db
            .locations()
            .by_source_id(location_source_id)
            .await
            .map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::Space,
                    ImportRelation::Location,
                    location_source_id,
                    err,
                )
            })?
            .ok_or_else(|| {
                ImportItemError::missing_relation(
                    ImportEntity::Space,
                    ImportRelation::Location,
                    location_source_id,
                )
            })?;

        let space_create = self.to_create(location.id)?;

        db.spaces()
            .upsert_by_source_id(space_create)
            .await
            .map_err(|err| ImportItemError::database_write(ImportEntity::Space, source_id, err))?;

        Ok(source_id)
    }
}
