use chrono::{DateTime, Utc};
use database::models::price::{Price, PriceCreate};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    helper::{extract_source_id, flatten_loc},
    models::localized_text::ApiLocalizedText,
};

#[derive(Debug, Deserialize)]
pub struct ApiPrice {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub jsonld_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "type")]
    pub price_type: String,
    pub visibility: String,
    pub code: Option<String>,
    pub description: Option<ApiLocalizedText>,
    pub minimum: i32,
    pub maximum: Option<i32>,
    pub step: i32,
    pub order: i32,
    pub auto_select_combo: bool,
    #[serde(default)]
    pub include_in_price_range: bool,
    pub cineville_box: bool,
    pub membership: Option<String>,
}

impl ApiPrice {
    pub fn to_model(self, id: Uuid) -> Price {
        let create: PriceCreate = self.into();

        Price {
            id,
            source_id: create.source_id,
            created_at: create.created_at,
            updated_at: create.updated_at,
            price_type: create.price_type,
            visibility: create.visibility,
            code: create.code,
            description_nl: create.description_nl,
            description_en: create.description_en,
            minimum: create.minimum,
            maximum: create.maximum,
            step: create.step,
            display_order: create.display_order,
            auto_select_combo: create.auto_select_combo,
            include_in_price_range: create.include_in_price_range,
            cineville_box: create.cineville_box,
            membership: create.membership,
        }
    }
}

impl From<ApiPrice> for PriceCreate {
    fn from(api: ApiPrice) -> Self {
        let source_id = extract_source_id(&api.id);
        let (description_nl, description_en) = flatten_loc(api.description);

        Self {
            source_id,
            created_at: api.created_at,
            updated_at: api.updated_at,
            price_type: api.price_type,
            visibility: api.visibility,
            code: api.code,
            description_nl,
            description_en,
            minimum: api.minimum,
            maximum: api.maximum,
            step: api.step,
            display_order: api.order,
            auto_select_combo: api.auto_select_combo,
            include_in_price_range: api.include_in_price_range,
            cineville_box: api.cineville_box,
            membership: api.membership,
        }
    }
}
