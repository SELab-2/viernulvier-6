use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::models::event::ApiEvent;

pub async fn insert_event(db: &Database, event: ApiEvent) -> Result<(), DatabaseError> {
    let Some(prod_source_id) = event.production_source_id() else {
        warn!("Events: event has no production source_id, skipping");
        return Ok(());
    };

    let Some(production) = db.productions().by_source_id(prod_source_id).await? else {
        warn!("Events: production source_id {prod_source_id} not found in db, skipping");
        return Ok(());
    };

    let hall_uuid = if let Some(hall_source_id) = event.hall_source_id() {
        let hall_opt = db.halls().by_source_id(hall_source_id).await?;
        if hall_opt.is_none() {
            warn!("Events: hall source_id {hall_source_id} not found in db");
        }
        hall_opt.map(|h| h.id)
    } else {
        None
    };

    let event_create = event.to_create(production.production.id, hall_uuid);
    db.events().insert(event_create).await?;
    Ok(())
}
