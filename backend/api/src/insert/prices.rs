use database::Database;

use crate::models::price::ApiPrice;
use crate::{
    error::{ImportEntity, ImportItemError, ImportRelation, ItemConversion},
    helper::extract_source_id,
};

impl ApiPrice {
    pub async fn upsert_import(
        self,
        db: &Database,
    ) -> Result<ItemConversion<Option<i32>>, ImportItemError> {
        let source_id = extract_source_id(&self.id);

        if let Some(source_id) = source_id
            && let Some(existing) = db.prices().by_source_id(source_id).await.map_err(|err| {
                ImportItemError::database_lookup(
                    ImportEntity::Price,
                    ImportRelation::Price,
                    source_id,
                    err,
                )
            })?
        {
            let model = self.to_model(existing.id);
            db.prices().update(model).await.map_err(|err| {
                ImportItemError::database_write(ImportEntity::Price, Some(source_id), err)
            })?;
            return Ok(ItemConversion::without_warnings(Some(source_id)));
        }

        db.prices()
            .insert(self.into())
            .await
            .map_err(|err| ImportItemError::database_write(ImportEntity::Price, source_id, err))?;

        Ok(ItemConversion::without_warnings(source_id))
    }
}
