use chrono::{DateTime, Utc};
use database::models::price_rank::{PriceRank, PriceRankCreate};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    helper::{extract_source_id, flatten_loc},
    models::localized_text::ApiLocalizedText,
};

#[derive(Debug, Deserialize)]
pub struct ApiPriceRank {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub description: Option<ApiLocalizedText>,
    pub code: String,
    pub position: i32,
    pub sold_out_buffer: Option<i32>,
}

impl ApiPriceRank {
    pub fn to_model(self, id: Uuid) -> PriceRank {
        let create: PriceRankCreate = self.into();

        PriceRank {
            id,
            source_id: create.source_id,
            created_at: create.created_at,
            updated_at: create.updated_at,
            description_nl: create.description_nl,
            description_en: create.description_en,
            code: create.code,
            position: create.position,
            sold_out_buffer: create.sold_out_buffer,
        }
    }
}

impl From<ApiPriceRank> for PriceRankCreate {
    fn from(api: ApiPriceRank) -> Self {
        let source_id = extract_source_id(&api.id);
        let (description_nl, description_en) = flatten_loc(api.description);

        Self {
            source_id,
            created_at: api.created_at,
            updated_at: api.updated_at,
            description_nl,
            description_en,
            code: api.code,
            position: api.position,
            sold_out_buffer: api.sold_out_buffer,
        }
    }
}
