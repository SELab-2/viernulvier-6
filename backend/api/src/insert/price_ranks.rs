use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::price_rank::ApiPriceRank;

pub async fn insert_price_rank(db: &Database, rank: ApiPriceRank) -> Result<(), DatabaseError> {
    let source_id = extract_source_id(&rank.id);

    if let Some(source_id) = source_id
        && let Some(existing) = db.price_ranks().by_source_id(source_id).await?
    {
        let model = rank.to_model(existing.id);
        db.price_ranks().update(model).await?;
        return Ok(());
    }

    db.price_ranks().insert(rank.into()).await?;
    Ok(())
}
