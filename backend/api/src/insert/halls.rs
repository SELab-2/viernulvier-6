use database::Database;

use crate::{
    error::{ImportEntity, ImportItemError, ImportItemWarning, ImportRelation, ItemConversion},
    helper::extract_source_id,
    models::hall::ApiHall,
};

impl ApiHall {
    pub async fn upsert_import(
        self,
        db: &Database,
    ) -> Result<ItemConversion<Option<i32>>, ImportItemError> {
        let hall_source_id = extract_source_id(&self.id);
        let mut warnings = Vec::new();

        let space_source_id = self.space.as_deref().and_then(extract_source_id);
        let space_uuid = match space_source_id {
            Some(source_id) => match db.spaces().by_source_id(source_id).await {
                Ok(space_opt) => {
                    let db_uuid = space_opt.map(|space| space.id);

                    if db_uuid.is_none() {
                        warnings.push(ImportItemWarning::missing_optional_relation(
                            ImportEntity::Hall,
                            ImportRelation::Space,
                            source_id,
                        ));
                    }

                    db_uuid
                }
                Err(err) => {
                    return Err(ImportItemError::database_lookup(
                        ImportEntity::Hall,
                        ImportRelation::Space,
                        source_id,
                        err,
                    ));
                }
            },
            None => None,
        };

        let hall_conversion = self.to_create(space_uuid)?;
        warnings.extend(hall_conversion.warnings);

        db.halls()
            .upsert_by_source_id(hall_conversion.value)
            .await
            .map_err(|err| {
                ImportItemError::database_write(ImportEntity::Hall, hall_source_id, err)
            })?;

        Ok(ItemConversion {
            value: hall_source_id,
            warnings,
        })
    }
}
