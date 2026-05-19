//! Integration tests for ProductionImport adapter.
//! Tasks 4.1–4.7.
//!
//! Each `#[sqlx::test]` provisions a clean database with all migrations applied.
#![allow(clippy::indexing_slicing)]

use std::collections::BTreeMap;

use database::{
    Database,
    models::production::{ProductionCreate, ProductionTranslationData},
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::import::adapters::production::ProductionImport;
use viernulvier_archive::import::trait_def::ImportableEntity;
use viernulvier_archive::import::types::ResolvedRow;

// ─── helpers ─────────────────────────────────────────────────────────────────

fn make_row(pairs: &[(&str, Value)]) -> ResolvedRow {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect()
}

async fn seed_production_with_source_id(pool: &PgPool, source_id: i32) -> Uuid {
    let db = Database::new(pool.clone());
    let result = db
        .productions()
        .insert(
            ProductionCreate {
                source_id: Some(source_id),
                slug: format!("test-{source_id}"),
                video_1: None,
                video_2: None,
                eticket_info: None,
                uitdatabank_theme: None,
                uitdatabank_type: None,
            },
            vec![],
        )
        .await
        .expect("seed insert failed");
    result.production.id
}

async fn seed_production_with_translation(
    pool: &PgPool,
    title: &str,
    source_id: Option<i32>,
) -> Uuid {
    let db = Database::new(pool.clone());
    let slug = slug::slugify(title);
    let result = db
        .productions()
        .insert(
            ProductionCreate {
                source_id,
                slug,
                video_1: None,
                video_2: None,
                eticket_info: None,
                uitdatabank_theme: None,
                uitdatabank_type: None,
            },
            vec![ProductionTranslationData {
                language_code: "nl".to_string(),
                title: Some(title.to_string()),
                supertitle: None,
                artist: None,
                meta_title: None,
                meta_description: None,
                tagline: None,
                teaser: None,
                description: None,
                description_extra: None,
                description_2: None,
                quote: None,
                quote_source: None,
                programme: None,
                info: None,
                description_short: None,
            }],
        )
        .await
        .expect("seed insert failed");
    result.production.id
}

// ─── Task 4.1 — field spec ────────────────────────────────────────────────────

#[test]
fn field_spec_contains_all_six_fields() {
    let adapter = ProductionImport;
    let fields = adapter.target_fields();
    let names: Vec<&str> = fields.iter().map(|f| f.name.as_str()).collect();

    assert!(names.contains(&"title_nl"), "missing title_nl");
    assert!(names.contains(&"supertitle_nl"), "missing supertitle_nl");
    assert!(names.contains(&"description_nl"), "missing description_nl");
    assert!(names.contains(&"description_en"), "missing description_en");
    assert!(
        names.contains(&"uitdatabank_theme"),
        "missing uitdatabank_theme"
    );
    assert!(names.contains(&"source_id"), "missing source_id");
    assert_eq!(names.len(), 6, "expected exactly 6 fields");
}

#[test]
fn entity_type_is_production() {
    let adapter = ProductionImport;
    assert_eq!(adapter.entity_type(), "production");
}

// ─── Task 4.2 — lookup_existing ──────────────────────────────────────────────

#[sqlx::test]
async fn lookup_existing_finds_by_source_id(pool: PgPool) {
    let id = seed_production_with_source_id(&pool, 1234).await;
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("source_id", json!(1234))]);
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, Some(id));
}

#[sqlx::test]
async fn lookup_existing_returns_none_for_unknown_source_id(pool: PgPool) {
    let _id = seed_production_with_source_id(&pool, 1234).await;
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("source_id", json!(9999))]);
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, None);
}

#[sqlx::test]
async fn lookup_existing_returns_none_when_source_id_absent(pool: PgPool) {
    let _id = seed_production_with_source_id(&pool, 1234).await;
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row: ResolvedRow = BTreeMap::new();
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, None);
}

// ─── Task 4.3 — resolve_references ──────────────────────────────────────────

#[sqlx::test]
async fn resolve_references_returns_empty(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;
    let raw_row = BTreeMap::new();
    let result = adapter
        .resolve_references(&raw_row, &db)
        .await
        .expect("resolve failed");
    assert!(result.per_column.is_empty());
}

// ─── Task 4.4 — validate_row ─────────────────────────────────────────────────

#[test]
fn validate_row_warns_when_title_nl_missing() {
    let adapter = ProductionImport;
    let row: ResolvedRow = BTreeMap::new();
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning");
    assert_eq!(warnings[0].code, "required_missing");
    assert_eq!(warnings[0].field.as_deref(), Some("title_nl"));
}

#[test]
fn validate_row_warns_when_title_nl_empty_string() {
    let adapter = ProductionImport;
    let row = make_row(&[("title_nl", json!(""))]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning for empty string");
    assert_eq!(warnings[0].code, "required_missing");
}

#[test]
fn validate_row_no_warnings_when_title_nl_present() {
    let adapter = ProductionImport;
    let row = make_row(&[("title_nl", json!("Hello"))]);
    let warnings = adapter.validate_row(&row);
    assert!(warnings.is_empty(), "expected no warnings");
}

// ─── Task 4.5 — apply_row create ─────────────────────────────────────────────

#[sqlx::test]
async fn apply_row_creates_production(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[
        ("title_nl", json!("Hello")),
        ("description_nl", json!("World")),
        ("uitdatabank_theme", json!("Dance")),
        ("source_id", json!(42)),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(result.production.source_id, Some(42));
    assert_eq!(
        result.production.uitdatabank_theme.as_deref(),
        Some("Dance")
    );
    assert_eq!(result.production.slug, "hello");

    let nl = result.translations.iter().find(|t| t.language_code == "nl");
    assert!(nl.is_some(), "expected NL translation");
    let nl = nl.unwrap();
    assert_eq!(nl.title.as_deref(), Some("Hello"));
    assert_eq!(nl.description.as_deref(), Some("World"));
}

#[sqlx::test]
async fn apply_row_updates_existing_production(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let existing_id = seed_production_with_translation(&pool, "Old", Some(99)).await;

    let row = make_row(&[
        ("title_nl", json!("New")),
        ("description_nl", json!("Updated")),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let returned_id = adapter
        .apply_row(Some(existing_id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    assert_eq!(returned_id, existing_id);

    let result = db
        .productions()
        .by_id(existing_id)
        .await
        .expect("by_id failed");
    // slug should be unchanged (was "old")
    assert_eq!(result.production.slug, "old");

    let nl = result.translations.iter().find(|t| t.language_code == "nl");
    assert!(nl.is_some(), "expected NL translation");
    let nl = nl.unwrap();
    assert_eq!(nl.title.as_deref(), Some("New"));
    assert_eq!(nl.description.as_deref(), Some("Updated"));
}

// ─── Task 4.6 — build_diff ───────────────────────────────────────────────────

#[sqlx::test]
async fn build_diff_detects_changed_fields(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    // seed with uitdatabank_theme="Old" and NL title="A"
    let create = ProductionCreate {
        source_id: None,
        slug: "a".to_string(),
        video_1: None,
        video_2: None,
        eticket_info: None,
        uitdatabank_theme: Some("Old".to_string()),
        uitdatabank_type: None,
    };
    let trans = vec![ProductionTranslationData {
        language_code: "nl".to_string(),
        title: Some("A".to_string()),
        supertitle: None,
        artist: None,
        meta_title: None,
        meta_description: None,
        tagline: None,
        teaser: None,
        description: None,
        description_extra: None,
        description_2: None,
        quote: None,
        quote_source: None,
        programme: None,
        info: None,
        description_short: None,
    }];
    let seeded = db
        .productions()
        .insert(create, trans)
        .await
        .expect("seed failed");
    let id = seeded.production.id;

    let row = make_row(&[
        ("uitdatabank_theme", json!("New")),
        ("title_nl", json!("B")),
    ]);

    let diff = adapter
        .build_diff(id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(
        diff.contains_key("uitdatabank_theme"),
        "expected uitdatabank_theme in diff"
    );
    assert!(diff.contains_key("title_nl"), "expected title_nl in diff");

    let theme_diff = &diff["uitdatabank_theme"];
    assert_eq!(theme_diff.current, Some(json!("Old")));
    assert_eq!(theme_diff.incoming, Some(json!("New")));

    let title_diff = &diff["title_nl"];
    assert_eq!(title_diff.current, Some(json!("A")));
    assert_eq!(title_diff.incoming, Some(json!("B")));
}

#[sqlx::test]
async fn build_diff_excludes_unchanged_fields(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let create = ProductionCreate {
        source_id: None,
        slug: "same".to_string(),
        video_1: None,
        video_2: None,
        eticket_info: None,
        uitdatabank_theme: Some("Same".to_string()),
        uitdatabank_type: None,
    };
    let seeded = db
        .productions()
        .insert(create, vec![])
        .await
        .expect("seed failed");
    let id = seeded.production.id;

    let row = make_row(&[("uitdatabank_theme", json!("Same"))]);
    let diff = adapter
        .build_diff(id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(
        !diff.contains_key("uitdatabank_theme"),
        "unchanged field should not be in diff"
    );
}

// ─── Task 4.7 — revert_row ───────────────────────────────────────────────────

#[sqlx::test]
async fn revert_row_deletes_production(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let id = seed_production_with_source_id(&pool, 500).await;

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .revert_row(id, &db, &mut tx)
        .await
        .expect("revert_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await;
    assert!(
        result.is_err(),
        "production should no longer exist after revert"
    );
}

// ─── Fix 1 — source_id in diff / preserved on update ─────────────────────────

#[sqlx::test]
async fn build_diff_detects_source_id_mismatch(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let id = seed_production_with_source_id(&pool, 10).await;

    let row = make_row(&[("source_id", json!(99))]);
    let diff = adapter
        .build_diff(id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(diff.contains_key("source_id"), "expected source_id in diff");
    let entry = &diff["source_id"];
    assert_eq!(entry.current, Some(json!(10)));
    assert_eq!(entry.incoming, Some(json!(99)));
}

#[sqlx::test]
async fn apply_row_update_preserves_source_id(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let id = seed_production_with_source_id(&pool, 10).await;

    let row = make_row(&[("title_nl", json!("Updated")), ("source_id", json!(99))]);

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .apply_row(Some(id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(
        result.production.source_id,
        Some(10),
        "source_id must not change on update"
    );
}

// ─── Fix 3 — slug fallback for punctuation-only title ────────────────────────

#[sqlx::test]
async fn apply_row_creates_with_fallback_slug_for_punctuation_title(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("title_nl", json!("!!!"))]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(result.production.slug, "untitled");
}

// ─── Fix 4 — additional test cases ───────────────────────────────────────────

#[sqlx::test]
async fn lookup_existing_finds_by_string_source_id(pool: PgPool) {
    // CSV cells arrive as Value::String; the adapter must coerce to i32.
    let id = seed_production_with_source_id(&pool, 1234).await;
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("source_id", json!("1234"))]);
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, Some(id));
}

#[sqlx::test]
async fn apply_row_creates_with_string_source_id_from_csv(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("title_nl", json!("Hello")), ("source_id", json!("42"))]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(result.production.source_id, Some(42));
}

#[sqlx::test]
async fn build_diff_detects_source_id_mismatch_with_string(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let id = seed_production_with_source_id(&pool, 10).await;

    let row = make_row(&[("source_id", json!("99"))]);
    let diff = adapter
        .build_diff(id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(diff.contains_key("source_id"), "expected source_id in diff");
    let entry = &diff["source_id"];
    assert_eq!(entry.current, Some(json!(10)));
    assert_eq!(entry.incoming, Some(json!(99)));
}

#[sqlx::test]
async fn lookup_existing_returns_none_for_unparseable_string_source_id(pool: PgPool) {
    let _id = seed_production_with_source_id(&pool, 1234).await;
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("source_id", json!("not-a-number"))]);
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, None);
}

#[sqlx::test]
async fn lookup_existing_returns_none_for_source_id_overflow(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("source_id", json!(3_000_000_000_u64))]);
    let result = adapter
        .lookup_existing(&row, &db)
        .await
        .expect("lookup failed");
    assert_eq!(result, None);
}

#[sqlx::test]
async fn apply_row_creates_with_only_title_nl(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[("title_nl", json!("Minimal"))]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(result.production.slug, "minimal");
    assert_eq!(result.production.source_id, None);
    assert_eq!(result.production.uitdatabank_theme, None);

    let nl = result.translations.iter().find(|t| t.language_code == "nl");
    assert!(nl.is_some(), "expected NL translation");
    let nl = nl.unwrap();
    assert_eq!(nl.title.as_deref(), Some("Minimal"));
    assert_eq!(nl.description, None);
}

#[sqlx::test]
async fn apply_row_update_preserves_existing_en_translation_when_description_en_absent(
    pool: PgPool,
) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    // Seed a production with both NL and EN translations.
    let seeded = db
        .productions()
        .insert(
            ProductionCreate {
                source_id: None,
                slug: "seed-en".to_string(),
                video_1: None,
                video_2: None,
                eticket_info: None,
                uitdatabank_theme: None,
                uitdatabank_type: None,
            },
            vec![
                ProductionTranslationData {
                    language_code: "nl".to_string(),
                    title: Some("Original NL".to_string()),
                    supertitle: None,
                    artist: None,
                    meta_title: None,
                    meta_description: None,
                    tagline: None,
                    teaser: None,
                    description: None,
                    description_extra: None,
                    description_2: None,
                    quote: None,
                    quote_source: None,
                    programme: None,
                    info: None,
                    description_short: None,
                },
                ProductionTranslationData {
                    language_code: "en".to_string(),
                    title: None,
                    supertitle: None,
                    artist: None,
                    meta_title: None,
                    meta_description: None,
                    tagline: None,
                    teaser: None,
                    description: Some("old-en".to_string()),
                    description_extra: None,
                    description_2: None,
                    quote: None,
                    quote_source: None,
                    programme: None,
                    info: None,
                    description_short: None,
                },
            ],
        )
        .await
        .expect("seed insert failed");
    let id = seeded.production.id;

    // Update with only title_nl, no description_en.
    let row = make_row(&[("title_nl", json!("Updated"))]);

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .apply_row(Some(id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    let en = result.translations.iter().find(|t| t.language_code == "en");
    assert!(en.is_some(), "EN translation should still exist");
    assert_eq!(en.unwrap().description.as_deref(), Some("old-en"));
}

#[sqlx::test]
async fn apply_row_creates_with_description_en(pool: PgPool) {
    let db = Database::new(pool.clone());
    let adapter = ProductionImport;

    let row = make_row(&[
        ("title_nl", json!("Show")),
        ("description_en", json!("English description")),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.productions().by_id(id).await.expect("by_id failed");
    assert_eq!(
        result.translations.len(),
        2,
        "expected two translation rows (nl + en)"
    );

    let nl = result.translations.iter().find(|t| t.language_code == "nl");
    assert!(nl.is_some(), "expected NL translation");

    let en = result.translations.iter().find(|t| t.language_code == "en");
    assert!(en.is_some(), "expected EN translation");
    assert_eq!(
        en.unwrap().description.as_deref(),
        Some("English description")
    );
}
