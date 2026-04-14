use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::price::ApiPrice;

impl ApiPrice {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        let source_id = extract_source_id(&self.id);

        if let Some(source_id) = source_id
            && let Some(existing) = db.prices().by_source_id(source_id).await?
        {
            let model = self.to_model(existing.id);
            db.prices().update(model).await?;
            return Ok(());
        }

        db.prices().insert(self.into()).await?;
        Ok(())
    }
}
