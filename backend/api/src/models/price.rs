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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_api_price_extracts_source_id_and_description() {
        let api = ApiPrice {
            id: "/api/v1/prices/42".into(),
            jsonld_type: "Price".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            price_type: "base".into(),
            visibility: "public".into(),
            code: Some("STD".into()),
            description: Some(ApiLocalizedText {
                nl: Some("Standaard".into()),
                en: Some("Standard".into()),
                fr: None,
            }),
            minimum: 0,
            maximum: Some(1000),
            step: 0,
            order: 1,
            auto_select_combo: false,
            include_in_price_range: true,
            cineville_box: false,
            membership: None,
        };
        let create: PriceCreate = api.into();
        assert_eq!(create.source_id, Some(42));
        assert_eq!(create.price_type, "base");
        assert_eq!(create.description_nl, Some("Standaard".into()));
        assert_eq!(create.description_en, Some("Standard".into()));
        assert_eq!(create.minimum, 0);
        assert_eq!(create.maximum, Some(1000));
        assert_eq!(create.display_order, 1);
        assert!(create.include_in_price_range);
    }
}
