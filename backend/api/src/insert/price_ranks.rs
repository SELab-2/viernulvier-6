use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::price_rank::ApiPriceRank;

impl ApiPriceRank {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        let source_id = extract_source_id(&self.id);

        if let Some(source_id) = source_id
            && let Some(existing) = db.price_ranks().by_source_id(source_id).await?
        {
            let model = self.to_model(existing.id);
            db.price_ranks().update(model).await?;
            return Ok(());
        }

        db.price_ranks().insert(self.into()).await?;
        Ok(())
    }
}
