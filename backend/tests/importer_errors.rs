use api::{
    error::{ImportEntity, ImportField, ImportItemError, ImportRelation},
    models::{event_price::ApiEventPrice, localized_text::ApiLocalizedText, space::ApiSpace},
};
use chrono::Utc;
use database::Database;
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
