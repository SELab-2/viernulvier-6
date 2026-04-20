//! Integration tests for EventImport adapter.
//! Task 4.8 sub-steps 1–7.
//!
//! Each `#[sqlx::test]` provisions a clean database with all migrations applied.
#![allow(clippy::indexing_slicing)]

use std::collections::BTreeMap;

use database::{
    Database,
    models::{
        event::EventCreate,
        hall::HallCreate,
        production::{ProductionCreate, ProductionTranslationData},
    },
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;
use viernulvier_archive::import::adapters::event::EventImport;
use viernulvier_archive::import::trait_def::ImportableEntity;
use viernulvier_archive::import::types::{RawRow, ResolvedRow};

// ─── helpers ─────────────────────────────────────────────────────────────────

fn make_row(pairs: &[(&str, Value)]) -> ResolvedRow {
    pairs.iter().map(|(k, v)| (k.to_string(), v.clone())).collect()
}

fn make_raw_row(pairs: &[(&str, &str)]) -> RawRow {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), Some(v.to_string())))
        .collect()
}

async fn seed_production_with_nl_title(pool: &PgPool, title: &str) -> Uuid {
    let db = Database::new(pool.clone());
    let slug = slug::slugify(title);
    let result = db
        .productions()
        .insert(
            ProductionCreate {
                source_id: None,
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
        .expect("seed production insert failed");
    result.production.id
}

async fn seed_hall(pool: &PgPool, name: &str) -> Uuid {
    let db = Database::new(pool.clone());
    let hall = db
        .halls()
        .insert(HallCreate {
            source_id: None,
            slug: slug::slugify(name),
            vendor_id: None,
            box_office_id: None,
            seat_selection: None,
            open_seating: None,
            name: name.to_string(),
            remark: None,
            space_id: None,
        })
        .await
        .expect("seed hall insert failed");
    hall.id
}

async fn seed_event(pool: &PgPool, production_id: Uuid, source_id: Option<i32>) -> Uuid {
    let db = Database::new(pool.clone());
    let now = chrono::Utc::now();
    let event = db
        .events()
        .insert(EventCreate {
            source_id,
            created_at: now,
            updated_at: now,
            starts_at: now,
            ends_at: None,
            intermission_at: None,
            doors_at: None,
            vendor_id: None,
            box_office_id: None,
            uitdatabank_id: None,
            max_tickets_per_order: None,
            production_id,
            status: "scheduled".to_string(),
            hall_id: None,
        })
        .await
        .expect("seed event insert failed");
    event.id
}

// ─── Sub-step 1 — field spec + entity_type ───────────────────────────────────

#[test]
fn field_spec_contains_all_five_fields() {
    let adapter = EventImport;
    let fields = adapter.target_fields();
    let names: Vec<&str> = fields.iter().map(|f| f.name.as_str()).collect();

    assert!(names.contains(&"start_time"), "missing start_time");
    assert!(names.contains(&"end_time"), "missing end_time");
    assert!(names.contains(&"hall_id"), "missing hall_id");
    assert!(names.contains(&"production_id"), "missing production_id");
    assert!(names.contains(&"source_id"), "missing source_id");
    assert_eq!(names.len(), 5, "expected exactly 5 fields");
}

#[test]
fn entity_type_is_event() {
    let adapter = EventImport;
    assert_eq!(adapter.entity_type(), "event");
}

// ─── Sub-step 2 — lookup_existing ────────────────────────────────────────────

#[sqlx::test]
async fn lookup_existing_finds_by_source_id(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Test Production").await;
    let event_id = seed_event(&pool, prod_id, Some(555)).await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row = make_row(&[("source_id", json!(555))]);
    let result = adapter.lookup_existing(&row, &db).await.expect("lookup failed");
    assert_eq!(result, Some(event_id));
}

#[sqlx::test]
async fn lookup_existing_returns_none_for_unknown_source_id(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Test Production").await;
    let _event_id = seed_event(&pool, prod_id, Some(555)).await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row = make_row(&[("source_id", json!(9999))]);
    let result = adapter.lookup_existing(&row, &db).await.expect("lookup failed");
    assert_eq!(result, None);
}

#[sqlx::test]
async fn lookup_existing_returns_none_when_source_id_absent(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Test Production").await;
    let _event_id = seed_event(&pool, prod_id, Some(555)).await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row: ResolvedRow = BTreeMap::new();
    let result = adapter.lookup_existing(&row, &db).await.expect("lookup failed");
    assert_eq!(result, None);
}

// ─── Sub-step 3 — resolve_references ─────────────────────────────────────────

#[sqlx::test]
async fn resolve_references_fuzzy_matches_hall_name(pool: PgPool) {
    let _grote = seed_hall(&pool, "Grote Zaal").await;
    let _kleine = seed_hall(&pool, "Kleine Zaal").await;
    let _studio = seed_hall(&pool, "Studio").await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let raw_row = make_raw_row(&[("hall_id", "grote")]);
    let resolution = adapter
        .resolve_references(&raw_row, &db)
        .await
        .expect("resolve_references failed");

    let suggestions = resolution.per_column.get("hall_id").expect("no hall_id key");
    assert!(!suggestions.is_empty(), "expected suggestions for hall_id");
    assert_eq!(
        suggestions[0].label, "Grote Zaal",
        "top suggestion should be 'Grote Zaal'"
    );
}

#[sqlx::test]
async fn resolve_references_fuzzy_matches_production_title(pool: PgPool) {
    let _id1 = seed_production_with_nl_title(&pool, "De Grote Voorstelling").await;
    let _id2 = seed_production_with_nl_title(&pool, "Kleine Nachtmuziek").await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let raw_row = make_raw_row(&[("production_id", "grote")]);
    let resolution = adapter
        .resolve_references(&raw_row, &db)
        .await
        .expect("resolve_references failed");

    let suggestions = resolution
        .per_column
        .get("production_id")
        .expect("no production_id key");
    assert!(!suggestions.is_empty(), "expected suggestions for production_id");
    assert_eq!(
        suggestions[0].label, "De Grote Voorstelling",
        "top suggestion should be 'De Grote Voorstelling'"
    );
}

#[sqlx::test]
async fn resolve_references_missing_hall_id_omitted(pool: PgPool) {
    let _grote = seed_hall(&pool, "Grote Zaal").await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    // Row has production_id but NOT hall_id.
    let raw_row = make_raw_row(&[("production_id", "grote")]);
    let resolution = adapter
        .resolve_references(&raw_row, &db)
        .await
        .expect("resolve_references failed");

    assert!(
        !resolution.per_column.contains_key("hall_id"),
        "hall_id should not be in per_column when absent from row"
    );
}

#[sqlx::test]
async fn resolve_references_empty_input_does_not_panic(pool: PgPool) {
    let _grote = seed_hall(&pool, "Grote Zaal").await;
    let _kleine = seed_hall(&pool, "Kleine Zaal").await;

    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let raw_row = make_raw_row(&[("hall_id", "")]);
    let resolution = adapter
        .resolve_references(&raw_row, &db)
        .await
        .expect("resolve_references with empty input should not fail");

    // Verify it returns suggestions (all scored low) without panicking.
    let suggestions = resolution.per_column.get("hall_id").expect("no hall_id key");
    // We had 2 halls seeded → at most 3 suggestions, at least 2.
    assert!(!suggestions.is_empty(), "expected some suggestions even for empty input");
    // All scores should be in [0, 1].
    for s in suggestions {
        assert!(s.score >= 0.0 && s.score <= 1.0, "score out of range: {}", s.score);
    }
}

// ─── Sub-step 4 — validate_row ───────────────────────────────────────────────

#[test]
fn validate_row_no_warnings_for_valid_row() {
    let adapter = EventImport;
    let prod_uuid = "00000000-0000-7000-8000-000000000001";
    let row = make_row(&[
        ("start_time", json!("2024-01-15T20:00:00Z")),
        ("production_id", json!(prod_uuid)),
    ]);
    let warnings = adapter.validate_row(&row);
    assert!(warnings.is_empty(), "expected no warnings, got: {warnings:?}");
}

#[test]
fn validate_row_warns_when_start_time_missing() {
    let adapter = EventImport;
    let prod_uuid = "00000000-0000-7000-8000-000000000001";
    let row = make_row(&[("production_id", json!(prod_uuid))]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning");
    assert_eq!(warnings[0].field.as_deref(), Some("start_time"));
    assert_eq!(warnings[0].code, "invalid_datetime");
}

#[test]
fn validate_row_warns_when_start_time_unparseable() {
    let adapter = EventImport;
    let prod_uuid = "00000000-0000-7000-8000-000000000001";
    let row = make_row(&[
        ("start_time", json!("not-a-date")),
        ("production_id", json!(prod_uuid)),
    ]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning");
    assert_eq!(warnings[0].field.as_deref(), Some("start_time"));
    assert_eq!(warnings[0].code, "invalid_datetime");
}

#[test]
fn validate_row_warns_when_production_id_missing() {
    let adapter = EventImport;
    let row = make_row(&[("start_time", json!("2024-01-15T20:00:00Z"))]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning");
    assert_eq!(warnings[0].field.as_deref(), Some("production_id"));
    assert_eq!(warnings[0].code, "unresolved_reference");
}

#[test]
fn validate_row_warns_when_hall_id_is_invalid_uuid() {
    let adapter = EventImport;
    let prod_uuid = "00000000-0000-7000-8000-000000000001";
    let row = make_row(&[
        ("start_time", json!("2024-01-15T20:00:00Z")),
        ("production_id", json!(prod_uuid)),
        ("hall_id", json!("not-a-uuid")),
    ]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected one warning for hall_id");
    assert_eq!(warnings[0].field.as_deref(), Some("hall_id"));
    assert_eq!(warnings[0].code, "unresolved_reference");
}

// ─── Sub-step 5 — apply_row ───────────────────────────────────────────────────

#[sqlx::test]
async fn apply_row_creates_event_with_all_fields(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Test Show").await;
    let hall_id = seed_hall(&pool, "Grote Zaal").await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row = make_row(&[
        ("start_time", json!("2024-03-15T20:00:00Z")),
        ("end_time", json!("2024-03-15 22:30:00")),
        ("production_id", json!(prod_id.to_string())),
        ("hall_id", json!(hall_id.to_string())),
        ("source_id", json!(42)),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let event = db.events().by_id(id).await.expect("by_id failed");
    assert_eq!(event.production_id, prod_id);
    assert_eq!(event.hall_id, Some(hall_id));
    assert_eq!(event.source_id, Some(42));
    assert_eq!(event.status, "scheduled");
    assert!(event.ends_at.is_some(), "ends_at should be set");
}

#[sqlx::test]
async fn apply_row_creates_event_with_only_required_fields(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Minimal Show").await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row = make_row(&[
        ("start_time", json!("2024-03-15T20:00:00Z")),
        ("production_id", json!(prod_id.to_string())),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let id = adapter
        .apply_row(None, &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let event = db.events().by_id(id).await.expect("by_id failed");
    assert_eq!(event.production_id, prod_id);
    assert_eq!(event.hall_id, None);
    assert_eq!(event.source_id, None);
    assert_eq!(event.ends_at, None);
}

#[sqlx::test]
async fn apply_row_updates_existing_event(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Original Show").await;
    let event_id = seed_event(&pool, prod_id, Some(10)).await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let new_starts_at = "2025-06-01T19:30:00Z";
    let row = make_row(&[
        ("start_time", json!(new_starts_at)),
        ("production_id", json!(prod_id.to_string())),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    let returned_id = adapter
        .apply_row(Some(event_id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    assert_eq!(returned_id, event_id);

    let event = db.events().by_id(event_id).await.expect("by_id failed");
    assert_eq!(
        event.starts_at.to_rfc3339(),
        "2025-06-01T19:30:00+00:00",
        "starts_at should be updated"
    );
}

#[sqlx::test]
async fn apply_row_update_preserves_source_id(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Source Show").await;
    let event_id = seed_event(&pool, prod_id, Some(77)).await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let row = make_row(&[
        ("start_time", json!("2025-06-01T19:30:00Z")),
        ("production_id", json!(prod_id.to_string())),
        // Incoming source_id is different — should be ignored on update.
        ("source_id", json!(999)),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .apply_row(Some(event_id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let event = db.events().by_id(event_id).await.expect("by_id failed");
    assert_eq!(event.source_id, Some(77), "source_id must not change on update");
}

// ─── Review fixes ────────────────────────────────────────────────────────────

#[sqlx::test]
async fn apply_row_update_bumps_updated_at(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Bump Show").await;
    let event_id = seed_event(&pool, prod_id, None).await;
    let db = Database::new(pool.clone());

    // Capture the original updated_at before calling apply_row.
    let original_updated_at = db
        .events()
        .by_id(event_id)
        .await
        .expect("by_id failed")
        .updated_at;

    // Sleep 1 ms so the new timestamp is strictly greater even on fast clocks.
    tokio::time::sleep(std::time::Duration::from_millis(1)).await;

    let adapter = EventImport;
    let row = make_row(&[
        ("start_time", json!("2025-06-01T19:30:00Z")),
        ("production_id", json!(prod_id.to_string())),
    ]);

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .apply_row(Some(event_id), &row, &db, &mut tx)
        .await
        .expect("apply_row failed");
    tx.commit().await.expect("commit tx");

    let event = db.events().by_id(event_id).await.expect("by_id failed");
    assert!(
        event.updated_at > original_updated_at,
        "updated_at should be bumped on update (was {original_updated_at}, got {})",
        event.updated_at
    );
}

#[test]
fn validate_row_warns_when_end_time_unparseable() {
    let adapter = EventImport;
    let prod_uuid = "00000000-0000-7000-8000-000000000001";
    let row = make_row(&[
        ("start_time", json!("2024-01-15T20:00:00Z")),
        ("production_id", json!(prod_uuid)),
        ("end_time", json!("not-a-date")),
    ]);
    let warnings = adapter.validate_row(&row);
    assert_eq!(warnings.len(), 1, "expected exactly one warning, got: {warnings:?}");
    assert_eq!(warnings[0].field.as_deref(), Some("end_time"));
    assert_eq!(warnings[0].code, "invalid_datetime");
}

// ─── Sub-step 6 — build_diff ─────────────────────────────────────────────────

#[sqlx::test]
async fn build_diff_detects_changed_start_time(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Diff Show").await;
    let event_id = seed_event(&pool, prod_id, None).await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let new_starts_at = "2025-06-01T19:30:00Z";
    let row = make_row(&[
        ("start_time", json!(new_starts_at)),
        ("production_id", json!(prod_id.to_string())),
    ]);

    let diff = adapter
        .build_diff(event_id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(diff.contains_key("start_time"), "expected start_time in diff");
}

#[sqlx::test]
async fn build_diff_unchanged_hall_id_excluded(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Same Hall Show").await;
    let hall_id = seed_hall(&pool, "Studio").await;
    let db = Database::new(pool.clone());

    // Create event directly with the hall_id already set.
    let now = chrono::Utc::now();
    let event = db
        .events()
        .insert(EventCreate {
            source_id: None,
            created_at: now,
            updated_at: now,
            starts_at: now,
            ends_at: None,
            intermission_at: None,
            doors_at: None,
            vendor_id: None,
            box_office_id: None,
            uitdatabank_id: None,
            max_tickets_per_order: None,
            production_id: prod_id,
            status: "scheduled".to_string(),
            hall_id: Some(hall_id),
        })
        .await
        .expect("insert failed");

    let adapter = EventImport;
    let row = make_row(&[
        ("start_time", json!(now.to_rfc3339())),
        ("production_id", json!(prod_id.to_string())),
        ("hall_id", json!(hall_id.to_string())),
    ]);

    let diff = adapter
        .build_diff(event.id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(
        !diff.contains_key("hall_id"),
        "unchanged hall_id should not appear in diff"
    );
}

#[sqlx::test]
async fn build_diff_absent_incoming_hall_id_excluded(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "No Hall Row").await;
    let event_id = seed_event(&pool, prod_id, None).await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    // Row does not include hall_id at all.
    let now = db.events().by_id(event_id).await.expect("by_id").starts_at;
    let row = make_row(&[
        ("start_time", json!(now.to_rfc3339())),
        ("production_id", json!(prod_id.to_string())),
    ]);

    let diff = adapter
        .build_diff(event_id, &row, &db)
        .await
        .expect("build_diff failed");

    assert!(
        !diff.contains_key("hall_id"),
        "absent incoming hall_id should not appear in diff"
    );
}

// ─── Sub-step 7 — revert_row ─────────────────────────────────────────────────

#[sqlx::test]
async fn revert_row_deletes_event(pool: PgPool) {
    let prod_id = seed_production_with_nl_title(&pool, "Revert Show").await;
    let event_id = seed_event(&pool, prod_id, None).await;
    let db = Database::new(pool.clone());
    let adapter = EventImport;

    let mut tx = pool.begin().await.expect("begin tx");
    adapter
        .revert_row(event_id, &db, &mut tx)
        .await
        .expect("revert_row failed");
    tx.commit().await.expect("commit tx");

    let result = db.events().by_id(event_id).await;
    assert!(result.is_err(), "event should no longer exist after revert");
}
