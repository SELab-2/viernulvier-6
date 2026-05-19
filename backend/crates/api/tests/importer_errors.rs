use std::collections::HashMap;
use ingest::{
    error::{ImportEntity, ImportField, ImportItemError, ImportRelation, ImportItemWarning},
    models::{
        event::ApiEvent,
        event_price::ApiEventPrice,
        hall::ApiHall,
        localized_text::ApiLocalizedText,
        location::ApiLocation,
        price::ApiPrice,
        price_rank::ApiPriceRank,
        production::ApiProduction,
        space::ApiSpace,
    },
};
use chrono::Utc;
use db::Database;
use sqlx::PgPool;

fn space_with_location(location: &str) -> ApiSpace {
    ApiSpace {
        id: "/api/v1/spaces/42".into(),
        jsonld_type: "Space".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        name: ApiLocalizedText {
            nl: Some("Main space".into()),
            en: None,
            fr: None,
        },
        location: location.into(),
        halls: vec![],
    }
}

fn event_price_with_refs(amount: &str, event: &str, price: &str, rank: &str) -> ApiEventPrice {
    ApiEventPrice {
        id: "/api/v1/events/prices/88".into(),
        jsonld_type: "EventPrice".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        available: 10,
        amount: amount.into(),
        box_office_id: None,
        contingent_id: None,
        expires_at: None,
        event: event.into(),
        price: price.into(),
        rank: rank.into(),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_space_invalid_location_reference_is_item_error(db: PgPool) {
    let database = Database::new(db);
    let err = space_with_location("/api/v1/locations/not-an-id")
        .upsert_import(&database)
        .await
        .unwrap_err();

    match err {
        ImportItemError::InvalidReference {
            entity,
            field,
            value,
        } => {
            assert_eq!(entity, ImportEntity::Space);
            assert_eq!(field, ImportField::Location);
            assert_eq!(value, "/api/v1/locations/not-an-id");
        }
        other => panic!("expected InvalidReference, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_space_missing_location_relation_is_item_error(db: PgPool) {
    let database = Database::new(db);
    let err = space_with_location("/api/v1/locations/404")
        .upsert_import(&database)
        .await
        .unwrap_err();

    match err {
        ImportItemError::MissingRelation {
            entity,
            relation,
            source_id,
        } => {
            assert_eq!(entity, ImportEntity::Space);
            assert_eq!(relation, ImportRelation::Location);
            assert_eq!(source_id, 404);
        }
        other => panic!("expected MissingRelation, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_price_invalid_amount_is_item_error(db: PgPool) {
    let database = Database::new(db);
    let err = event_price_with_refs(
        "not-money",
        "/api/v1/events/1",
        "/api/v1/prices/2",
        "/api/v1/prices/ranks/3",
    )
    .upsert_import(&database)
    .await
    .unwrap_err();

    match err {
        ImportItemError::InvalidReference {
            entity,
            field,
            value,
        } => {
            assert_eq!(entity, ImportEntity::EventPrice);
            assert_eq!(field, ImportField::Amount);
            assert_eq!(value, "not-money");
        }
        other => panic!("expected InvalidReference, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_price_invalid_event_reference_is_item_error(db: PgPool) {
    let database = Database::new(db);
    let err = event_price_with_refs(
        "12.34",
        "/api/v1/events/nope",
        "/api/v1/prices/2",
        "/api/v1/prices/ranks/3",
    )
    .upsert_import(&database)
    .await
    .unwrap_err();

    match err {
        ImportItemError::InvalidReference {
            entity,
            field,
            value,
        } => {
            assert_eq!(entity, ImportEntity::EventPrice);
            assert_eq!(field, ImportField::Event);
            assert_eq!(value, "/api/v1/events/nope");
        }
        other => panic!("expected InvalidReference, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_price_missing_event_relation_is_item_error(db: PgPool) {
    let database = Database::new(db);
    let err = event_price_with_refs(
        "12.34",
        "/api/v1/events/404",
        "/api/v1/prices/2",
        "/api/v1/prices/ranks/3",
    )
    .upsert_import(&database)
    .await
    .unwrap_err();

    match err {
        ImportItemError::MissingRelation {
            entity,
            relation,
            source_id,
        } => {
            assert_eq!(entity, ImportEntity::EventPrice);
            assert_eq!(relation, ImportRelation::Event);
            assert_eq!(source_id, 404);
        }
        other => panic!("expected MissingRelation, got {other:?}"),
    }
}

fn hall_with_space(space: &str) -> ApiHall {
    ApiHall {
        id: "/api/v1/halls/10".into(),
        jsonld_type: "Hall".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        vendor_id: None,
        box_office_id: None,
        seat_selection: "".into(),
        open_seating: "".into(),
        name: ApiLocalizedText { nl: Some("Zaal".into()), en: None, fr: None },
        remark: None,
        space: Some(space.into()),
    }
}

fn event_with_status(status: &str) -> ApiEvent {
    serde_json::from_value(serde_json::json!({
        "@id": "/api/v1/events/99",
        "@type": "Event",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "starts_at": "2025-01-01T20:00:00Z",
        "ends_at": null,
        "intermission_at": null,
        "doors_at": null,
        "box_office_id": null,
        "vendor_id": null,
        "max_tickets_per_order": null,
        "uitdatabank_id": null,
        "secure": false,
        "sms_verification": false,
        "production": { "@id": "/api/v1/productions/1" },
        "status": status,
        "hall": "/api/v1/halls/1",
        "info": null,
        "eticket_info": null,
        "external_order_url": null
    })).unwrap()
}

fn location_with_name(name: &str) -> ApiLocation {
    ApiLocation {
        id: "/api/v1/locations/55".into(),
        jsonld_type: "Location".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        name: Some(name.into()),
        code: None, street: None, number: None,
        postal_code: None, city: None, phone_1: None, phone_2: None,
        own_location: "".into(), country: None, uitdatabank_id: None,
    }
}

fn status_map() -> HashMap<String, String> {
    [("available".into(), "available".into())].into()
}

#[sqlx::test]
#[test_log::test]
async fn importer_hall_missing_space_is_warning(db: PgPool) {
    let database = Database::new(db);
    let result = hall_with_space("/api/v1/spaces/404")
        .upsert_import(&database)
        .await
        .unwrap();
    assert_eq!(result.value, Some(10));
    assert_eq!(result.warnings.len(), 1);
    match &result.warnings[0] {
        ImportItemWarning::MissingOptionalRelation { entity, relation, source_id } => {
            assert_eq!(*entity, ImportEntity::Hall);
            assert_eq!(*relation, ImportRelation::Space);
            assert_eq!(*source_id, 404);
        }
        other => panic!("expected MissingOptionalRelation, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_invalid_status_is_error(db: PgPool) {
    let database = Database::new(db);

    let prod: ApiProduction = serde_json::from_value(serde_json::json!({
        "@id": "/api/v1/productions/1",
        "@type": "Event",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "vendor_id": "test",
        "box_office_id": null,
        "performer_field": null,
        "performer_type": null,
        "attendance_mode": "mixed",
        "supertitle": null,
        "title": { "nl": "Test", "en": "Test", "fr": null },
        "artist": null, "meta_title": null, "meta_description": null,
        "tagline": null, "teaser": null, "description": null,
        "description_extra": null, "description_2": null,
        "video_1": null, "video_2": null,
        "quote": null, "quote_source": null, "programme": null,
        "info": null, "description_short": null, "eticket_info": null,
        "genres": [], "events": [], "media_gallery": null,
        "review_gallery": null, "poster_gallery": null,
        "uitdatabank_keywords": [], "uitdatabank_theme": null, "uitdatabank_type": null
    })).unwrap();
    let data: ingest::models::production::ProductionImportData = prod.into();
    database
        .productions()
        .insert(data.production, data.translations)
        .await
        .unwrap();

    let err = event_with_status("bogus-status")
        .upsert_import(&database, &status_map())
        .await
        .unwrap_err();

    match err {
        ImportItemError::InvalidReference { entity, field, value } => {
            assert_eq!(entity, ImportEntity::Event);
            assert_eq!(field, ImportField::Status);
            assert_eq!(value, "bogus-status");
        }
        other => panic!("expected InvalidReference, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_missing_production_is_error(db: PgPool) {
    let database = Database::new(db);
    let mut event = event_with_status("available");
    event.production.id = "/api/v1/productions/404".into();

    let err = event
        .upsert_import(&database, &status_map())
        .await
        .unwrap_err();

    match err {
        ImportItemError::MissingRelation { entity, relation, source_id } => {
            assert_eq!(entity, ImportEntity::Event);
            assert_eq!(relation, ImportRelation::Production);
            assert_eq!(source_id, 404);
        }
        other => panic!("expected MissingRelation, got {other:?}"),
    }
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_missing_hall_is_warning(db: PgPool) {
    let database = Database::new(db);

    let prod: ApiProduction = serde_json::from_value(serde_json::json!({
        "@id": "/api/v1/productions/1",
        "@type": "Event",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "vendor_id": "test",
        "box_office_id": null,
        "performer_field": null,
        "performer_type": null,
        "attendance_mode": "mixed",
        "supertitle": null,
        "title": { "nl": "Test", "en": "Test", "fr": null },
        "artist": null, "meta_title": null, "meta_description": null,
        "tagline": null, "teaser": null, "description": null,
        "description_extra": null, "description_2": null,
        "video_1": null, "video_2": null,
        "quote": null, "quote_source": null, "programme": null,
        "info": null, "description_short": null, "eticket_info": null,
        "genres": [], "events": [], "media_gallery": null,
        "review_gallery": null, "poster_gallery": null,
        "uitdatabank_keywords": [], "uitdatabank_theme": null, "uitdatabank_type": null
    })).unwrap();
    let data: ingest::models::production::ProductionImportData = prod.into();
    database
        .productions()
        .insert(data.production, data.translations)
        .await
        .unwrap();

    let mut event = event_with_status("available");
    event.hall = "/api/v1/halls/404".into();
    let result = event
        .upsert_import(&database, &status_map())
        .await
        .unwrap();

    assert_eq!(result.value, Some(99));
    assert!(
        result.warnings.iter().any(|w| matches!(w, ImportItemWarning::MissingOptionalRelation {
            entity: ImportEntity::Event,
            relation: ImportRelation::Hall,
            source_id: 404,
        })),
        "expected a missing_optional_relation warning for hall 404"
    );
}

#[sqlx::test]
#[test_log::test]
async fn importer_location_inserts_and_returns_source_id(db: PgPool) {
    let database = Database::new(db);
    let result = location_with_name("Testlocatie")
        .upsert_import(&database)
        .await
        .unwrap();
    assert_eq!(result, Some(55));

    let inserted = database.locations().by_source_id(55).await.unwrap().unwrap();
    assert_eq!(inserted.name, Some("Testlocatie".into()));
}

#[sqlx::test]
#[test_log::test]
async fn importer_production_inserts_and_returns_source_id(db: PgPool) {
    let database = Database::new(db);
    let prod: ApiProduction = serde_json::from_value(serde_json::json!({
        "@id": "/api/v1/productions/77",
        "@type": "Event",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "vendor_id": "test",
        "box_office_id": null,
        "performer_field": null,
        "performer_type": null,
        "attendance_mode": "mixed",
        "supertitle": null,
        "title": { "nl": "Import Test", "en": "Import Test", "fr": null },
        "artist": null, "meta_title": null, "meta_description": null,
        "tagline": null, "teaser": null, "description": null,
        "description_extra": null, "description_2": null,
        "video_1": null, "video_2": null,
        "quote": null, "quote_source": null, "programme": null,
        "info": null, "description_short": null, "eticket_info": null,
        "genres": [], "events": [], "media_gallery": null,
        "review_gallery": null, "poster_gallery": null,
        "uitdatabank_keywords": [], "uitdatabank_theme": null, "uitdatabank_type": null
    })).unwrap();
    let result = prod.upsert_import(&database).await.unwrap();
    assert_eq!(result, Some(77));

    let inserted = database.productions().by_source_id(77).await.unwrap().unwrap();
    assert!(inserted.production.slug.contains("import-test"));
    assert!(inserted.production.slug.contains("77"));
}

#[sqlx::test]
#[test_log::test]
async fn importer_price_inserts_and_returns_source_id(db: PgPool) {
    let database = Database::new(db);
    let price = ApiPrice {
        id: "/api/v1/prices/12".into(),
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
    let result = price.upsert_import(&database).await.unwrap();
    assert_eq!(result.value, Some(12));

    let inserted = database.prices().by_source_id(12).await.unwrap().unwrap();
    assert_eq!(inserted.price_type, "base");
}

#[sqlx::test]
#[test_log::test]
async fn importer_price_rank_inserts_and_returns_source_id(db: PgPool) {
    let database = Database::new(db);
    let rank = ApiPriceRank {
        id: "/api/v1/prices/ranks/7".into(),
        jsonld_type: "PriceRank".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        description: Some(ApiLocalizedText {
            nl: Some("Rang 1".into()),
            en: Some("Rank 1".into()),
            fr: None,
        }),
        code: "A".into(),
        position: 1,
        sold_out_buffer: Some(5),
    };
    let result = rank.upsert_import(&database).await.unwrap();
    assert_eq!(result.value, Some(7));

    let inserted = database.price_ranks().by_source_id(7).await.unwrap().unwrap();
    assert_eq!(inserted.code, "A");
    assert_eq!(inserted.position, 1);
}

#[sqlx::test]
#[test_log::test]
async fn importer_event_price_happy_path(db: PgPool) {
    let database = Database::new(db);

    let prod: ApiProduction = serde_json::from_value(serde_json::json!({
        "@id": "/api/v1/productions/1",
        "@type": "Event",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "vendor_id": "test",
        "box_office_id": null,
        "performer_field": null,
        "performer_type": null,
        "attendance_mode": "mixed",
        "supertitle": null,
        "title": { "nl": "Test", "en": "Test", "fr": null },
        "artist": null, "meta_title": null, "meta_description": null,
        "tagline": null, "teaser": null, "description": null,
        "description_extra": null, "description_2": null,
        "video_1": null, "video_2": null,
        "quote": null, "quote_source": null, "programme": null,
        "info": null, "description_short": null, "eticket_info": null,
        "genres": [], "events": [], "media_gallery": null,
        "review_gallery": null, "poster_gallery": null,
        "uitdatabank_keywords": [], "uitdatabank_theme": null, "uitdatabank_type": null
    })).unwrap();
    let data: ingest::models::production::ProductionImportData = prod.into();
    database
        .productions()
        .insert(data.production, data.translations)
        .await
        .unwrap();

    let price = ApiPrice {
        id: "/api/v1/prices/2".into(),
        jsonld_type: "Price".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        price_type: "base".into(),
        visibility: "public".into(),
        code: None, description: None,
        minimum: 0, maximum: None, step: 0, order: 0,
        auto_select_combo: false, include_in_price_range: false,
        cineville_box: false, membership: None,
    };
    price.upsert_import(&database).await.unwrap();

    let rank = ApiPriceRank {
        id: "/api/v1/prices/ranks/3".into(),
        jsonld_type: "PriceRank".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        description: None, code: "A".into(), position: 1,
        sold_out_buffer: None,
    };
    rank.upsert_import(&database).await.unwrap();

    let event = event_with_status("available");
    event.upsert_import(&database, &status_map()).await.unwrap();

    let event_price = event_price_with_refs(
        "12.34",
        "/api/v1/events/99",
        "/api/v1/prices/2",
        "/api/v1/prices/ranks/3",
    );
    let result = event_price.upsert_import(&database).await.unwrap();
    assert_eq!(result.value, Some(88));

    let inserted = database
        .event_prices()
        .by_source_id(88)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(inserted.amount_cents, 1234);
}
