#![allow(clippy::indexing_slicing)]
use database::{Database, models::entity_type::EntityType};
use sqlx::PgPool;
use uuid::Uuid;

mod common;

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn slim_tags_for_entities_groups_by_id(db: PgPool) {
    let database = Database::new(db);
    let id_1: Uuid = "11111111-1111-1111-1111-111111111111".parse().unwrap();
    let id_2: Uuid = "22222222-2222-2222-2222-222222222222".parse().unwrap();

    let result = database
        .tags()
        .slim_tags_for_entities(EntityType::Production, &[id_1, id_2])
        .await
        .expect("query should succeed");

    let one = result.get(&id_1).expect("entity 1 has tags");
    let slugs: Vec<_> = one.iter().map(|t| t.slug.as_str()).collect();
    assert!(slugs.contains(&"concert"));
    assert!(slugs.contains(&"workshop"));

    let two = result.get(&id_2).expect("entity 2 has tags");
    assert_eq!(two.len(), 1);
    assert_eq!(two[0].slug, "politics");
    assert_eq!(two[0].facet, "theme");
}

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn slim_tags_for_entities_empty_input(db: PgPool) {
    let database = Database::new(db);
    let result = database
        .tags()
        .slim_tags_for_entities(EntityType::Production, &[])
        .await
        .expect("query should succeed");
    assert!(result.is_empty());
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn slim_tags_for_entities_filters_by_type(db: PgPool) {
    let database = Database::new(db);
    let prod_id: Uuid = "11111111-1111-1111-1111-111111111111".parse().unwrap();

    // Querying as Article type should return no rows for this production id.
    let result = database
        .tags()
        .slim_tags_for_entities(EntityType::Article, &[prod_id])
        .await
        .expect("query should succeed");
    assert!(result.is_empty());
}

#[sqlx::test(fixtures("productions", "production_taggings"))]
#[test_log::test]
async fn slim_tags_for_entities_omits_untagged(db: PgPool) {
    let database = Database::new(db);
    let untagged: Uuid = "33333333-3333-3333-3333-333333333333".parse().unwrap();
    let result = database
        .tags()
        .slim_tags_for_entities(EntityType::Production, &[untagged])
        .await
        .expect("query should succeed");
    assert!(!result.contains_key(&untagged));
}
