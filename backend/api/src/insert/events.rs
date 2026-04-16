use std::collections::HashMap;

use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::models::event::ApiEvent;

impl ApiEvent {
    pub async fn insert(
        self,
        db: &Database,
        status_map: &HashMap<String, String>,
    ) -> Result<bool, DatabaseError> {
        let Some(prod_source_id) = self.production_source_id() else {
            warn!("Events: event has no production source_id, skipping");
            return Ok(false);
        };

        let Some(production) = db.productions().by_source_id(prod_source_id).await? else {
            warn!("Events: production source_id {prod_source_id} not found in db, skipping");
            return Ok(false);
        };

        let hall_uuid = if let Some(hall_source_id) = self.hall_source_id() {
            let hall_opt = db.halls().by_source_id(hall_source_id).await?;
            if hall_opt.is_none() {
                warn!("Events: hall source_id {hall_source_id} not found in db");
            }
            hall_opt.map(|h| h.id)
        } else {
            None
        };

        let Some(status) = status_map.get(&self.status).cloned() else {
            warn!(
                "Events: unknown status IRI '{}' for event {}, skipping",
                self.status, self.id
            );
            return Ok(false);
        };

        let event_create = self.to_create(production.production.id, hall_uuid, status);
        db.events().insert(event_create).await?;
        Ok(true)
    }
}
