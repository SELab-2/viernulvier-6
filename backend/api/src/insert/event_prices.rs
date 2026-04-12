use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::helper::{extract_source_id, parse_amount_cents};
use crate::models::event_price::ApiEventPrice;

pub async fn insert_event_price(
    db: &Database,
    event_price: ApiEventPrice,
) -> Result<(), DatabaseError> {
    let Some(amount_cents) = parse_amount_cents(&event_price.amount) else {
        warn!(
            "EventPrices: invalid amount '{}' for event price {}, skipping",
            event_price.amount, event_price.id
        );
        return Ok(());
    };

    let Some(event_source_id) = extract_source_id(&event_price.event) else {
        warn!("EventPrices: event_price has no event source_id, skipping");
        return Ok(());
    };

    let Some(price_source_id) = extract_source_id(&event_price.price) else {
        warn!("EventPrices: event_price has no price source_id, skipping");
        return Ok(());
    };

    let Some(rank_source_id) = extract_source_id(&event_price.rank) else {
        warn!("EventPrices: event_price has no rank source_id, skipping");
        return Ok(());
    };

    let Some(event) = db.events().by_source_id(event_source_id).await? else {
        warn!("EventPrices: event source_id {event_source_id} not found in db, skipping");
        return Ok(());
    };

    let Some(price) = db.prices().by_source_id(price_source_id).await? else {
        warn!("EventPrices: price source_id {price_source_id} not found in db, skipping");
        return Ok(());
    };

    let Some(rank) = db.price_ranks().by_source_id(rank_source_id).await? else {
        warn!("EventPrices: rank source_id {rank_source_id} not found in db, skipping");
        return Ok(());
    };

    let source_id = extract_source_id(&event_price.id);

    if let Some(source_id) = source_id
        && let Some(existing) = db.event_prices().by_source_id(source_id).await?
    {
        let model =
            event_price.to_model(existing.id, event.id, price.id, rank.id, amount_cents);
        db.event_prices().update(model).await?;
        return Ok(());
    }

    let event_price_create = event_price.to_create(event.id, price.id, rank.id, amount_cents);
    db.event_prices().insert(event_price_create).await?;
    Ok(())
}
