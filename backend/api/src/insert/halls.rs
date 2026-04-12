use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::helper::extract_source_id;
use crate::models::hall::ApiHall;

pub async fn insert_hall(db: &Database, hall: ApiHall) -> Result<(), DatabaseError> {
    let source_id = hall.space.as_deref().and_then(extract_source_id);
    let space_uuid = match source_id {
        Some(id) => {
            let db_uuid = db.spaces().by_source_id(id).await?.map(|s| s.id);
            if db_uuid.is_none() {
                warn!("Halls: Space source_id {id} expected but not found in db");
            }
            db_uuid
        }
        None => None,
    };

    let hall_create = hall.to_create(space_uuid);
    db.halls().insert(hall_create).await?;
    Ok(())
}
