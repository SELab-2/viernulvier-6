use database::{Database, error::DatabaseError};

use crate::models::location::ApiLocation;

impl ApiLocation {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        db.locations().insert(self.into(), vec![]).await?;
        Ok(())
    }
}
