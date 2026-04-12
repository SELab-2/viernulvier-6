use database::{Database, error::DatabaseError};
use tracing::warn;

use crate::helper::{extract_source_id, parse_amount_cents};
use crate::models::event_price::ApiEventPrice;

impl ApiEventPrice {
    pub async fn insert(self, db: &Database) -> Result<(), DatabaseError> {
        let Some(amount_cents) = parse_amount_cents(&self.amount) else {
            warn!(
                "EventPrices: invalid amount '{}' for event price {}, skipping",
                self.amount, self.id
            );
            return Ok(());
        };

        let Some(event_source_id) = extract_source_id(&self.event) else {
            warn!("EventPrices: event_price has no event source_id, skipping");
            return Ok(());
        };

        let Some(price_source_id) = extract_source_id(&self.price) else {
            warn!("EventPrices: event_price has no price source_id, skipping");
            return Ok(());
        };

        let Some(rank_source_id) = extract_source_id(&self.rank) else {
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

        let source_id = extract_source_id(&self.id);

        if let Some(source_id) = source_id
            && let Some(existing) = db.event_prices().by_source_id(source_id).await?
        {
            let model = self.to_model(existing.id, event.id, price.id, rank.id, amount_cents);
            db.event_prices().update(model).await?;
            return Ok(());
        }

        let event_price_create = self.to_create(event.id, price.id, rank.id, amount_cents);
        db.event_prices().insert(event_price_create).await?;
        Ok(())
    }
}
