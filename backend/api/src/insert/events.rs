use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::models::event::ApiEvent;

impl ApiEvent {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        let Some(prod_source_id) = self.production_source_id() else {
            warn!("Events: event has no production source_id, skipping");
            return Ok(());
        };

        let Some(production) = db.productions().by_source_id(prod_source_id).await? else {
            warn!("Events: production source_id {prod_source_id} not found in db, skipping");
            return Ok(());
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

        let event_create = self.to_create(production.production.id);
        let event = db.events().insert(event_create).await?;

        if let Some(hall_id) = hall_uuid {
            db.events().sync_halls(event.id, vec![hall_id]).await?;
        }
        Ok(())
    }
}
