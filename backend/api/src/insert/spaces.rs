use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::space::ApiSpace;

impl ApiSpace {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        let location_source_id = extract_source_id(&self.location).unwrap();
        let location = db
            .locations()
            .by_source_id(location_source_id)
            .await?
            .unwrap();
        let space_create = self.to_create(location.location.id);
        db.spaces().insert(space_create).await?;
        Ok(())
    }
}
