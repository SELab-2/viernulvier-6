use database::Database;

use crate::models::event_price::ApiEventPrice;
use crate::{
    error::{ImportEntity, ImportField, ImportItemError, ImportRelation, ItemConversion},
    helper::{extract_source_id, parse_amount_cents},
};

impl ApiEventPrice {
    pub async fn upsert_import(
        self,
        db: &Database,
    ) -> Result<ItemConversion<Option<i32>>, ImportItemError> {
        let event_price_source_id = extract_source_id(&self.id);

        let Some(amount_cents) = parse_amount_cents(&self.amount) else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::EventPrice,
                ImportField::Amount,
                &self.amount,
            ));
        };

        let Some(event_source_id) = extract_source_id(&self.event) else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::EventPrice,
                ImportField::Event,
                &self.event,
            ));
        };

        let Some(price_source_id) = extract_source_id(&self.price) else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::EventPrice,
                ImportField::Price,
                &self.price,
            ));
        };

        let Some(rank_source_id) = extract_source_id(&self.rank) else {
            return Err(ImportItemError::invalid_reference(
                ImportEntity::EventPrice,
                ImportField::Rank,
                &self.rank,
            ));
        };

        let event = db
            .events()
            .by_source_id(event_source_id)
            .await
            .map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::EventPrice,
                    ImportRelation::Event,
                    event_source_id,
                    err,
                )
            })?
            .ok_or_else(|| {
                ImportItemError::missing_relation(
                    ImportEntity::EventPrice,
                    ImportRelation::Event,
                    event_source_id,
                )
            })?;

        let price = db
            .prices()
            .by_source_id(price_source_id)
            .await
            .map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::EventPrice,
                    ImportRelation::Price,
                    price_source_id,
                    err,
                )
            })?
            .ok_or_else(|| {
                ImportItemError::missing_relation(
                    ImportEntity::EventPrice,
                    ImportRelation::Price,
                    price_source_id,
                )
            })?;

        let rank = db
            .price_ranks()
            .by_source_id(rank_source_id)
            .await
            .map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::EventPrice,
                    ImportRelation::PriceRank,
                    rank_source_id,
                    err,
                )
            })?
            .ok_or_else(|| {
                ImportItemError::missing_relation(
                    ImportEntity::EventPrice,
                    ImportRelation::PriceRank,
                    rank_source_id,
                )
            })?;

        if let Some(source_id) = event_price_source_id
            && let Some(existing) =
                db.event_prices()
                    .by_source_id(source_id)
                    .await
                    .map_err(|err| {
                        ImportItemError::database_lookup(
                            ImportEntity::EventPrice,
                            ImportRelation::EventPrice,
                            source_id,
                            err,
                        )
                    })?
        {
            let model = self.to_model(existing.id, event.id, price.id, rank.id, amount_cents);
            db.event_prices().update(model).await.map_err(|err| {
                ImportItemError::database_write(ImportEntity::EventPrice, Some(source_id), err)
            })?;
            return Ok(ItemConversion::without_warnings(Some(source_id)));
        }

        let event_price_create = self.to_create(event.id, price.id, rank.id, amount_cents);
        db.event_prices()
            .insert(event_price_create)
            .await
            .map_err(|err| {
                ImportItemError::database_write(
                    ImportEntity::EventPrice,
                    event_price_source_id,
                    err,
                )
            })?;

        Ok(ItemConversion::without_warnings(event_price_source_id))
    }
}
