use database::Database;

use crate::{
    error::{
        ImportEntity, ImportField, ImportItemError, ImportItemWarning, ImportRelation,
        ItemConversion,
    },
    helper::extract_source_id,
    models::event::ApiEvent,
};

impl ApiEvent {
    pub async fn upsert_import(
        self,
        db: &Database,
    ) -> Result<ItemConversion<Option<i32>>, ImportItemError> {
        let event_source_id = extract_source_id(&self.id);
        let mut warnings = Vec::new();

        let Some(production_source_id) = self.production_source_id() else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::Event,
                ImportField::Production,
                &self.production.id,
            ));
        };

        let production = db
            .productions()
            .by_source_id(production_source_id)
            .await
            .map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::Event,
                    ImportRelation::Production,
                    production_source_id,
                    err,
                )
            })?
            .ok_or_else(|| {
                ImportItemError::missing_relation(
                    ImportEntity::Event,
                    ImportRelation::Production,
                    production_source_id,
                )
            })?;

        let hall_uuid = if let Some(hall_source_id) = self.hall_source_id() {
            match db.halls().by_source_id(hall_source_id).await {
                Ok(hall_opt) => {
                    if hall_opt.is_none() {
                        warnings.push(ImportItemWarning::missing_optional_relation(
                            ImportEntity::Event,
                            ImportRelation::Hall,
                            hall_source_id,
                        ));
                    }

                    hall_opt.map(|hall| hall.id)
                }
                Err(err) => {
                    return Err(ImportItemError::database_lookup(
                        ImportEntity::Event,
                        ImportRelation::Hall,
                        hall_source_id,
                        err,
                    ));
                }
            }
        } else {
            None
        };

        let event_conversion = self.to_create(production.production.id)?;
        warnings.extend(event_conversion.warnings);

        let event = db
            .events()
            .upsert_by_source_id(event_conversion.value)
            .await
            .map_err(|err| {
                ImportItemError::database_write(ImportEntity::Event, event_source_id, err)
            })?;

        let hall_ids = hall_uuid.into_iter().collect::<Vec<_>>();
        db.events()
            .sync_halls(event.id, hall_ids)
            .await
            .map_err(|err| {
                ImportItemError::database_write(ImportEntity::Event, event_source_id, err)
            })?;

        Ok(ItemConversion {
            value: event_source_id,
            warnings,
        })
    }
}
