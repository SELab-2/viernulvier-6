use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::space::ApiSpace;

pub async fn insert_space(db: &Database, space: ApiSpace) -> Result<(), DatabaseError> {
    let location_source_id = extract_source_id(&space.location).unwrap();
    let location = db
        .locations()
        .by_source_id(location_source_id)
        .await?
        .unwrap();
    let space_create = space.to_create(location.location.id);
    db.spaces().insert(space_create).await?;
    Ok(())
}
