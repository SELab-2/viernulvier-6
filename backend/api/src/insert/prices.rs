use database::{Database, error::DatabaseError};

use crate::helper::extract_source_id;
use crate::models::price::ApiPrice;

pub async fn insert_price(db: &Database, price: ApiPrice) -> Result<(), DatabaseError> {
    let source_id = extract_source_id(&price.id);

    if let Some(source_id) = source_id
        && let Some(existing) = db.prices().by_source_id(source_id).await?
    {
        let model = price.to_model(existing.id);
        db.prices().update(model).await?;
        return Ok(());
    }

    db.prices().insert(price.into()).await?;
    Ok(())
}
