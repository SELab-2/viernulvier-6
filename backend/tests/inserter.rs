mod common;

use chrono::Utc;
use database::Database;
use sqlx::PgPool;

use api::models::{
    location::ApiLocation,
    price::ApiPrice,
    price_rank::ApiPriceRank,
};

#[sqlx::test]
#[test_log::test]
async fn upsert_price_inserts_new(db: PgPool) {
    let db = Database::new(db);

    let api = ApiPrice {
        id: "/api/v1/prices/100".into(),
        jsonld_type: "Price".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        price_type: "base".into(),
        visibility: "public".into(),
        code: Some("STD".into()),
        description: None,
        minimum: 0,
        maximum: Some(2000),
        step: 10,
        order: 1,
        auto_select_combo: false,
        include_in_price_range: true,
        cineville_box: false,
        membership: None,
    };

    let result = api.upsert_import(&db).await.unwrap();
    assert!(result.value.is_some());
    let source_id = result.value.unwrap();
    assert!(source_id > 0);
}

#[sqlx::test]
#[test_log::test]
async fn upsert_price_updates_existing(db: PgPool) {
    let db = Database::new(db);

    let api = ApiPrice {
        id: "/api/v1/prices/200".into(),
        jsonld_type: "Price".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        price_type: "base".into(),
        visibility: "public".into(),
        code: Some("FIRST".into()),
        description: None,
        minimum: 0,
        maximum: Some(1000),
        step: 5,
        order: 1,
        auto_select_combo: false,
        include_in_price_range: false,
        cineville_box: false,
        membership: None,
    };

    let result = api.upsert_import(&db).await.unwrap();
    let source_id = result.value.unwrap();

    let updated = ApiPrice {
        id: "/api/v1/prices/200".into(),
        jsonld_type: "Price".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        price_type: "discount".into(),
        visibility: "hidden".into(),
        code: Some("UPDATED".into()),
        description: None,
        minimum: 5,
        maximum: Some(500),
        step: 10,
        order: 2,
        auto_select_combo: true,
        include_in_price_range: true,
        cineville_box: true,
        membership: None,
    };

    let result = updated.upsert_import(&db).await.unwrap();
    assert_eq!(result.value, Some(source_id));

    let existing = db.prices().by_source_id(source_id).await.unwrap().unwrap();
    assert_eq!(existing.price_type, "discount");
    assert_eq!(existing.code.as_deref(), Some("UPDATED"));
    assert_eq!(existing.visibility, "hidden");
}

#[sqlx::test]
#[test_log::test]
async fn upsert_price_rank_inserts_new(db: PgPool) {
    let db = Database::new(db);

    let api = ApiPriceRank {
        id: "/api/v1/price-ranks/300".into(),
        jsonld_type: "PriceRank".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        description: Some(api::models::localized_text::ApiLocalizedText {
            nl: Some("Standaard tarief".into()),
            en: Some("Standard rate".into()),
            fr: None,
        }),
        code: "A".into(),
        position: 1,
        sold_out_buffer: Some(5),
    };

    let result = api.upsert_import(&db).await.unwrap();
    assert!(result.value.is_some());
    let source_id = result.value.unwrap();
    assert!(source_id > 0);
}

#[sqlx::test]
#[test_log::test]
async fn upsert_location_inserts_new(db: PgPool) {
    let db = Database::new(db);

    let api = ApiLocation {
        id: "https://www.viernulvier.gent/api/v1/locations/400".into(),
        jsonld_type: "Location".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        name: Some("Test Venue".into()),
        code: Some("TV".into()),
        street: Some("Teststraat".into()),
        number: Some("42".into()),
        postal_code: Some("9000".into()),
        city: Some("Gent".into()),
        phone_1: None,
        phone_2: None,
        own_location: "1".into(),
        country: Some("BE".into()),
        uitdatabank_id: Some("uit-400".into()),
    };

    let result = api.upsert_import(&db).await.unwrap();
    assert_eq!(result, Some(400));

    let db_loc = db.locations().by_source_id(400).await.unwrap().unwrap();
    assert_eq!(db_loc.name.as_deref(), Some("Test Venue"));
    assert_eq!(db_loc.is_owned_by_viernulvier, Some(true));
}
