use database::{Database, error::DatabaseError};

use crate::models::location::ApiLocation;

pub async fn insert_location(db: &Database, location: ApiLocation) -> Result<(), DatabaseError> {
    db.locations().insert(location.into(), vec![]).await?;
    Ok(())
}
