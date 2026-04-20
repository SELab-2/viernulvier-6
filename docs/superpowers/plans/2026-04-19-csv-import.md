# CSV Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic CSV import system at `/cms/import` that uploads a CSV, maps columns to fields of any entity type, runs a persisted dry-run with inline edits and fuzzy-matched FK resolution, commits in background, and exposes a per-row undoable history.

**Architecture:** Rust `ImportableEntity` trait with per-entity adapters behind a registry. Three new tables (`import_sessions`, `import_rows`, `import_session_files`). CSV blobs on S3/Garage. In-process tokio background tasks poll for queued dry-run / commit work. Next.js four-stage flow (Upload → Map → Dry-run → Commit) plus history list/detail.

**Tech Stack:** Rust (axum, sqlx, utoipa, tokio, aws-sdk-s3, csv crate, strsim), PostgreSQL 16, Garage S3, Next.js 16 (App Router, React 19), TanStack Query, TypeScript, Tailwind v4, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-19-csv-import-design.md`

## Design Principle: Minimise touches to existing schema and logic

This plan is **purely additive** wherever it can be. Existing tables, models, repos, and handlers are **not modified** in their behaviour. The only pre-existing files we touch are declaration/wiring points (e.g. `backend/src/lib.rs`, `backend/database/src/lib.rs`, `frontend/src/hooks/api/query-keys.ts`, `messages/*.json`, regenerated `generated.ts`, and the placeholder page the user explicitly asked us to implement).

Rules:

- **No `ALTER TABLE` on existing production/event/artist/location/article/hall tables.** All of these already have `source_id INTEGER UNIQUE` (populated by the existing `ApiImporter`) — we reuse it as the legacy-ID lookup for CSV imports.
- Adapters consume existing repo methods; they do not add new methods to existing repos. Where a specific lookup-by-`source_id` does not exist yet, the adapter issues a direct `sqlx::query!` inline — no repo modification.
- All new code lives under `backend/src/import/`, `backend/database/src/repos/import.rs` + models, and `frontend/src/…/import/…`.

### Legacy-ID strategy (verified against existing schema)

```text
productions, events, halls, locations, spaces all already have:
    source_id INTEGER UNIQUE
```

Mapping from the legacy CSVs:

- Productions `ID` column → `source_id` (parse as i32).
- Productions `Planning ID` column → **unmapped in v1**. No corresponding column; out of scope. Flagged in spec open questions.
- Events have no explicit legacy id column in the legacy CSV, but if present, map to `source_id`.

"Does this row already exist?" becomes a single `SELECT id FROM {table} WHERE source_id = $1` call per adapter.

---

## Phase 0 — (intentionally empty)

No prerequisite schema work is needed — `source_id` already exists on every relevant table. Start at Phase 1.

## Phase 1 — Database schema

### Task 1.1: Write migration for import tables

**Files:**

- Create: `backend/migrations/YYYYMMDDHHMMSS_imports.up.sql`
- Create: `backend/migrations/YYYYMMDDHHMMSS_imports.down.sql`

- [ ] **Step 1: Create `up.sql`.**

```sql
CREATE TABLE import_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type       TEXT NOT NULL,
    filename          TEXT NOT NULL,
    original_headers  TEXT[] NOT NULL,
    mapping           JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL,
    row_count         INT  NOT NULL DEFAULT 0,
    created_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at      TIMESTAMPTZ,
    error             TEXT,
    CHECK (status IN (
        'uploaded','mapping','dry_run_pending','dry_run_ready',
        'committing','committed','failed','cancelled'))
);
CREATE INDEX import_sessions_created_at_idx ON import_sessions (created_at DESC);
CREATE INDEX import_sessions_status_idx ON import_sessions (status);
CREATE TRIGGER import_sessions_updated_at
    BEFORE UPDATE ON import_sessions
    FOR EACH ROW EXECUTE FUNCTION update_at_trigger();

CREATE TABLE import_rows (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    row_number        INT NOT NULL,
    raw_data          JSONB NOT NULL,
    overrides         JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_refs     JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL,
    target_entity_id  UUID,
    diff              JSONB,
    warnings          JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE (session_id, row_number),
    CHECK (status IN (
        'pending','will_create','will_update','will_skip',
        'error','created','updated','skipped','reverted'))
);
CREATE INDEX import_rows_session_id_idx ON import_rows (session_id);
CREATE INDEX import_rows_status_idx ON import_rows (status);

CREATE TABLE import_session_files (
    session_id UUID PRIMARY KEY REFERENCES import_sessions(id) ON DELETE CASCADE,
    s3_key     TEXT NOT NULL
);
```

- [ ] **Step 2: Create `down.sql`.**

```sql
DROP TABLE IF EXISTS import_session_files;
DROP TABLE IF EXISTS import_rows;
DROP TRIGGER IF EXISTS import_sessions_updated_at ON import_sessions;
DROP TABLE IF EXISTS import_sessions;
```

- [ ] **Step 3: Run + prepare + commit.**

```bash
cd backend && cargo sqlx migrate run && cargo sqlx prepare --workspace
git add backend/migrations/ backend/.sqlx/
git commit -m "feat(db): add import tables"
```

---

## Phase 2 — Backend models & repository

### Task 2.1: Declare model module files

**Files:**

- Modify: `backend/database/src/lib.rs` (the `pub mod models` block)
- Create: `backend/database/src/models/import_session.rs`
- Create: `backend/database/src/models/import_row.rs`

- [ ] **Step 1: Add `pub mod import_session; pub mod import_row;` inside the `pub mod models { ... }` block and `pub mod import;` inside `pub mod repos { ... }`.**

- [ ] **Step 2: Write `import_session.rs`.**

```rust
use serde::{Deserialize, Serialize};
use sqlx::types::{Json, Uuid};
use time::OffsetDateTime;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ImportSessionStatus {
    Uploaded,
    Mapping,
    DryRunPending,
    DryRunReady,
    Committing,
    Committed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize, ToSchema)]
pub struct ImportSession {
    pub id: Uuid,
    pub entity_type: String,
    pub filename: String,
    pub original_headers: Vec<String>,
    pub mapping: Json<ImportMapping>,
    pub status: ImportSessionStatus,
    pub row_count: i32,
    pub created_by: Uuid,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    pub committed_at: Option<OffsetDateTime>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct ImportMapping {
    /// CSV header -> target field name (or None if unmapped).
    pub columns: std::collections::BTreeMap<String, Option<String>>,
}
```

- [ ] **Step 3: Write `import_row.rs`.**

```rust
use serde::{Deserialize, Serialize};
use sqlx::types::{Json, Uuid};
use std::collections::BTreeMap;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ImportRowStatus {
    Pending, WillCreate, WillUpdate, WillSkip,
    Error, Created, Updated, Skipped, Reverted,
}

pub type RawCell = Option<String>;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportWarning {
    pub field: Option<String>,
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DiffEntry {
    pub current: Option<serde_json::Value>,
    pub incoming: Option<serde_json::Value>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize, ToSchema)]
pub struct ImportRow {
    pub id: Uuid,
    pub session_id: Uuid,
    pub row_number: i32,
    pub raw_data: Json<BTreeMap<String, RawCell>>,
    pub overrides: Json<BTreeMap<String, serde_json::Value>>,
    pub resolved_refs: Json<BTreeMap<String, Option<Uuid>>>,
    pub status: ImportRowStatus,
    pub target_entity_id: Option<Uuid>,
    pub diff: Option<Json<BTreeMap<String, DiffEntry>>>,
    pub warnings: Json<Vec<ImportWarning>>,
}
```

- [ ] **Step 4: Run `cargo check -p database`. Fix compile errors.**

- [ ] **Step 5: Commit.**

```bash
git add backend/database/src/
git commit -m "feat(db): add import session + row models"
```

### Task 2.2: Write failing tests for `ImportRepo`

**Files:**

- Create: `backend/database/src/repos/import.rs`
- Create: `backend/database/tests/import_repo.rs` (or add under existing tests module)

- [ ] **Step 1: Scan an existing repo test (e.g. `backend/tests/articles.rs`) to copy the DB-bootstrap pattern.**

- [ ] **Step 2: Write failing tests covering: `create_session`, `get_session`, `list_sessions`, `update_status`, `save_mapping`, `insert_rows`, `get_rows_for_session`, `update_row_overrides`, `update_row_resolved_refs`, `mark_row_skipped`.**

Sketch (expand each with assertions):

```rust
#[sqlx::test]
async fn creates_and_fetches_session(pool: sqlx::PgPool) {
    let db = database::Database::from_pool(pool);
    let user_id = seed_user(&db).await;
    let id = db.imports().create_session(CreateSession {
        entity_type: "production".into(),
        filename: "t.csv".into(),
        original_headers: vec!["Titel".into()],
        created_by: user_id,
    }).await.unwrap();
    let s = db.imports().get_session(id).await.unwrap().unwrap();
    assert_eq!(s.entity_type, "production");
    assert!(matches!(s.status, ImportSessionStatus::Uploaded));
}
```

- [ ] **Step 3: Run tests — expect failures ("imports() not found", etc).**

### Task 2.3: Implement `ImportRepo`

**Files:**

- Modify: `backend/database/src/repos/import.rs`
- Modify: `backend/database/src/lib.rs` (add `ImportRepo` to `Database::imports()`)

- [ ] **Step 1: Implement `ImportRepo` struct with a `PgPool` reference, matching sibling repos (see `hall.rs`).** Methods map 1:1 to the tests in 2.2. Use `sqlx::query_as!` for typed selects and `sqlx::query!` for writes. Example:

```rust
pub struct ImportRepo<'a> { pool: &'a PgPool }

impl<'a> ImportRepo<'a> {
    pub fn new(pool: &'a PgPool) -> Self { Self { pool } }

    pub async fn create_session(&self, input: CreateSession) -> Result<Uuid, DatabaseError> {
        let rec = sqlx::query!(
            r#"INSERT INTO import_sessions
               (entity_type, filename, original_headers, status, created_by)
               VALUES ($1,$2,$3,'uploaded',$4) RETURNING id"#,
            input.entity_type, input.filename, &input.original_headers, input.created_by
        ).fetch_one(self.pool).await?;
        Ok(rec.id)
    }
    // ... get_session, list_sessions (paginated), update_status, save_mapping,
    // insert_rows (bulk via UNNEST), get_rows_for_session (paginated),
    // update_row_overrides, update_row_resolved_refs, mark_row_skipped,
    // save_dry_run_result (per-row diff/warnings/status), set_file_key,
    // record_committed_row, record_reverted_row.
}
```

- [ ] **Step 2: Register on `Database`:**

```rust
impl Database {
    pub fn imports(&self) -> ImportRepo<'_> { ImportRepo::new(&self.pool) }
}
```

- [ ] **Step 3: Run `cargo sqlx prepare --workspace` then `cargo test -p database imports`.**

- [ ] **Step 4: Commit.**

```bash
git add backend/database backend/.sqlx
git commit -m "feat(db): add import repository"
```

---

## Phase 3 — Importable-entity trait + registry

### Task 3.1: Define the trait

**Files:**

- Create: `backend/src/import/mod.rs`
- Create: `backend/src/import/types.rs`
- Create: `backend/src/import/trait_def.rs`
- Modify: `backend/src/lib.rs` (`mod import;`)

- [ ] **Step 1: Write `types.rs`.**

```rust
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use std::collections::BTreeMap;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    String, Text, Integer, Decimal, Boolean,
    Date, DateTime,
    ForeignKey { target: String, match_field: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FieldSpec {
    pub name: String,
    pub label: String,
    pub field_type: FieldType,
    pub required: bool,
    pub unique_lookup: bool,
}

pub type RawRow = BTreeMap<String, Option<String>>;
pub type ResolvedRow = BTreeMap<String, serde_json::Value>;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReferenceSuggestion {
    pub id: Uuid,
    pub label: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Default)]
pub struct ReferenceResolution {
    /// column -> suggestions (top N, best first)
    pub per_column: BTreeMap<String, Vec<ReferenceSuggestion>>,
}
```

- [ ] **Step 2: Write `trait_def.rs`.**

```rust
use async_trait::async_trait;
use database::{Database, models::import_row::{DiffEntry, ImportWarning}};
use sqlx::{Postgres, Transaction, types::Uuid};
use std::collections::BTreeMap;
use crate::import::types::*;

#[async_trait]
pub trait ImportableEntity: Send + Sync {
    fn entity_type(&self) -> &'static str;
    fn target_fields(&self) -> Vec<FieldSpec>;

    async fn lookup_existing(&self, row: &ResolvedRow, db: &Database) -> anyhow::Result<Option<Uuid>>;
    async fn resolve_references(&self, row: &RawRow, db: &Database) -> anyhow::Result<ReferenceResolution>;

    fn validate_row(&self, row: &ResolvedRow) -> Vec<ImportWarning>;

    async fn build_diff(&self, entity_id: Uuid, row: &ResolvedRow, db: &Database)
        -> anyhow::Result<BTreeMap<String, DiffEntry>>;

    async fn apply_row(
        &self,
        existing_id: Option<Uuid>,
        row: &ResolvedRow,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<Uuid>;

    async fn revert_row(
        &self,
        entity_id: Uuid,
        db: &Database,
        tx: &mut Transaction<'_, Postgres>,
    ) -> anyhow::Result<()>;
}
```

- [ ] **Step 3: `cargo check`. Commit.**

```bash
git add backend/src/import/
git commit -m "feat(import): add ImportableEntity trait"
```

### Task 3.2: Registry

**Files:**

- Create: `backend/src/import/registry.rs`
- Modify: `backend/src/import/mod.rs`

- [ ] **Step 1: Write the registry.**

```rust
use std::{collections::HashMap, sync::Arc};
use crate::import::trait_def::ImportableEntity;

#[derive(Clone)]
pub struct ImportRegistry {
    entries: Arc<HashMap<&'static str, Arc<dyn ImportableEntity>>>,
}

impl ImportRegistry {
    pub fn new(adapters: Vec<Arc<dyn ImportableEntity>>) -> Self {
        let mut m = HashMap::new();
        for a in adapters { m.insert(a.entity_type(), a); }
        Self { entries: Arc::new(m) }
    }
    pub fn get(&self, entity_type: &str) -> Option<Arc<dyn ImportableEntity>> {
        self.entries.get(entity_type).cloned()
    }
    pub fn supported(&self) -> Vec<&'static str> {
        self.entries.keys().copied().collect()
    }
}
```

- [ ] **Step 2: Wire into `AppState`:** add `pub import_registry: ImportRegistry`, construct in `lib.rs::build_app_state` (registration list starts empty; adapters added in Phase 4).

- [ ] **Step 3: `cargo check`. Commit.**

```bash
git add backend/src/
git commit -m "feat(import): add entity registry"
```

---

## Phase 4 — Entity adapters

Follow strict TDD for each adapter: write an integration test invoking the trait method against a real DB, watch it fail, implement.

### Task 4.1: ProductionImport — field spec

**Files:**

- Create: `backend/src/import/adapters/mod.rs`
- Create: `backend/src/import/adapters/production.rs`
- Create: `backend/tests/import/production_adapter.rs`
- Modify: `backend/src/import/mod.rs` (`pub mod adapters;`)

- [ ] **Step 1: Write a test that asserts `ProductionImport::target_fields()` returns the expected list.**

```rust
#[test]
fn production_field_spec_includes_core_columns() {
    let a = ProductionImport;
    let names: Vec<&str> = a.target_fields().iter().map(|f| f.name.as_str()).collect();
    assert!(names.contains(&"title"));
    assert!(names.contains(&"subtitle"));
    assert!(names.contains(&"description_nl"));
    assert!(names.contains(&"description_en"));
    assert!(names.contains(&"genre"));
    assert!(names.contains(&"source_id"));
}
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `ProductionImport` skeleton with `target_fields()` returning the list (other trait methods `unimplemented!()` for now).**

```rust
pub struct ProductionImport;

#[async_trait]
impl ImportableEntity for ProductionImport {
    fn entity_type(&self) -> &'static str { "production" }
    fn target_fields(&self) -> Vec<FieldSpec> {
        use FieldType::*;
        vec![
            FieldSpec { name:"title".into(), label:"Title".into(), field_type:String, required:true, unique_lookup:false },
            FieldSpec { name:"subtitle".into(), label:"Subtitle".into(), field_type:String, required:false, unique_lookup:false },
            FieldSpec { name:"description_nl".into(), label:"Description (NL)".into(), field_type:Text, required:false, unique_lookup:false },
            FieldSpec { name:"description_en".into(), label:"Description (EN)".into(), field_type:Text, required:false, unique_lookup:false },
            FieldSpec { name:"genre".into(), label:"Genre".into(), field_type:String, required:false, unique_lookup:false },
            FieldSpec { name:"source_id".into(), label:"Source ID".into(), field_type:Integer, required:false, unique_lookup:true },
        ]
    }
    // unimplemented!() for the rest - filled in subsequent tasks
}
```

- [ ] **Step 4: Pass. Commit.**

### Task 4.2: ProductionImport — lookup_existing

**Files:**

- Modify: `backend/src/import/adapters/production.rs`
- Modify: `backend/tests/import/production_adapter.rs`

Rationale: we do not modify `ProductionRepo`. Lookup uses the existing `productions.source_id` column with a direct inline `sqlx::query!`.

- [ ] **Step 1: Write tests:**
  - Seed a production with id `P` and `source_id = 1234`, run `lookup_existing` with a resolved row containing `source_id = 1234` → returns `Some(P)`.
  - `source_id = 9999` (no match) → `None`.
  - Resolved row has no `source_id` → `None`.

- [ ] **Step 2: Implement.** Read `source_id` from the resolved row (as `i64` → cast to `i32`); if absent, return `None`; otherwise `SELECT id FROM productions WHERE source_id = $1`.

```rust
async fn lookup_existing(&self, row: &ResolvedRow, db: &Database) -> anyhow::Result<Option<Uuid>> {
    let Some(v) = row.get("source_id") else { return Ok(None) };
    let Some(n) = v.as_i64() else { return Ok(None) };
    let sid: i32 = match i32::try_from(n) { Ok(x) => x, Err(_) => return Ok(None) };
    let rec = sqlx::query!("SELECT id FROM productions WHERE source_id = $1", sid)
        .fetch_optional(db.pool()).await?;
    Ok(rec.map(|r| r.id))
}
```

(If `Database` does not yet expose `pub fn pool(&self) -> &PgPool`, add that accessor — this is a single-line additive change.)

- [ ] **Step 3: `cargo sqlx prepare --workspace`. Tests pass. Commit.**

### Task 4.3: ProductionImport — resolve_references

- [ ] Productions have no FK columns in v1, so `resolve_references` returns empty. Write a quick test asserting this, commit.

### Task 4.4: ProductionImport — validate_row

- [ ] **Step 1: Test cases:** (a) missing `title` → one warning with `code = "required_missing"`; (b) `title` present → no warnings.
- [ ] **Step 2: Implement.** Iterate `target_fields()`, check `required && row.get(name).is_none_or(is_empty)`.
- [ ] **Step 3: Commit.**

### Task 4.5: ProductionImport — apply_row (create + update)

- [ ] **Step 1: Integration test** seeding empty DB, applying a `ResolvedRow` with title/genre/source_id → asserts a production row exists in DB with those values (including `source_id`). Second test seeds an existing production, calls `apply_row` with `existing_id = Some(uuid)` and new title → asserts update to the production.
- [ ] **Step 2: Implement** using the existing `ProductionRepo::create`/`update` unchanged. Build the DTO from the `ResolvedRow` map including `source_id` (i32). Inspect `ProductionRepo::create`'s current signature before implementing — if it does not currently accept a `source_id`, use a direct `sqlx::query!` to `INSERT/UPDATE` (still no repo modification). `genre` goes to whichever existing field on productions holds it; verify against the current `Production` model.
- [ ] **Step 3: Commit.**

### Task 4.6: ProductionImport — build_diff

- [ ] Test: existing production has title "A", incoming has title "B" → diff contains `{ title: { current: "A", incoming: "B" } }`; same value → no entry. Implement by fetching current entity and comparing per field. Commit.

### Task 4.7: ProductionImport — revert_row

- [ ] **Tricky case:** reverts are "delete if created by this import, restore previous values if updated". For v1, **simplify**: only support revert for `Created` rows (delete the entity via existing `ProductionRepo::delete`; `ON DELETE CASCADE` already handles child rows). For `Updated` rows, return an error "update-revert not supported in v1" which bubbles up to a warning. Document in spec open questions.
- [ ] Test both paths. Implement. Commit.

### Task 4.8: EventImport — full adapter

**Files:**

- Create: `backend/src/import/adapters/event.rs`
- Create: `backend/tests/import/event_adapter.rs`

- [ ] **Step 1: `target_fields()` returns:** `start_time (DateTime, required)`, `end_time (DateTime, optional)`, `hall_id (ForeignKey target=hall match_field=name, required)`, `production_id (ForeignKey target=production match_field=title, required)`, `source_id (Integer, unique_lookup)`.

- [ ] **Step 2: `resolve_references()`** — for `hall_id` column: fuzzy-match CSV value against `halls.name` using `strsim::jaro_winkler`; return top 3 suggestions with score. Same for `production_id` against `productions.title`.

Implementation sketch:

```rust
async fn resolve_references(&self, row: &RawRow, db: &Database) -> anyhow::Result<ReferenceResolution> {
    let mut out = ReferenceResolution::default();
    if let Some(Some(name)) = row.get("hall_id") {
        out.per_column.insert("hall_id".into(), fuzzy_match_halls(db, name, 3).await?);
    }
    if let Some(Some(title)) = row.get("production_id") {
        out.per_column.insert("production_id".into(), fuzzy_match_productions(db, title, 3).await?);
    }
    Ok(out)
}
```

- [ ] **Step 3: `lookup_existing`** — via existing `events.source_id` column using an inline `sqlx::query!`. No modifications to `EventRepo`.

- [ ] **Step 4: `validate_row`** — warn if `start_time` unparseable, if FK columns lack a resolved id in `resolved_refs` for the row.

- [ ] **Step 5: `apply_row`** — resolve FK ids from `resolved_refs`, parse timestamps (RFC3339 preferred, fallback `%Y-%m-%d %H:%M:%S`), call existing `EventRepo::create`/`update` (or an inline `sqlx::query!` if the existing method does not accept `source_id`). Pass `source_id` through as an `i32` if present.

- [ ] **Step 6: `build_diff`, `revert_row`** following same pattern as Production.

- [ ] **Step 7: Each sub-step TDD'd.** Each commits on green.

### Task 4.9: Stub adapters for Article / Location / Artist

**Files:**

- Create: `backend/src/import/adapters/stub.rs`

- [ ] **Step 1: Write one generic stub type** parameterised by `entity_type`, returning empty `target_fields` and trait methods that return `anyhow::bail!("entity type not yet supported")`.

- [ ] **Step 2: Register `ArticleStub`, `LocationStub`, `ArtistStub` instances under the corresponding entity-type strings.**

- [ ] **Step 3: Wire all adapters into `ImportRegistry` construction in `lib.rs`.**

- [ ] **Step 4: Commit.**

---

## Phase 5 — CSV parsing + S3 file storage

### Task 5.1: CSV parser

**Files:**

- Create: `backend/src/import/csv_parser.rs`
- Create: `backend/tests/import/csv_parser.rs`

- [ ] **Step 1: Test:** parse a legacy `productions` CSV string → returns `{ headers: ["Titel", ...], preview: first 20 rows, total: N }`. Cover BOM, CRLF, quoted fields containing commas, and empty final row.

- [ ] **Step 2: Implement** using the `csv` crate. Return:

```rust
pub struct ParsedCsvPreview {
    pub headers: Vec<String>,
    pub preview_rows: Vec<BTreeMap<String, Option<String>>>,
    pub total_rows: usize,
}

pub fn parse_preview(bytes: &[u8]) -> Result<ParsedCsvPreview, CsvParseError> { ... }
pub fn parse_all(bytes: &[u8]) -> Result<Vec<BTreeMap<String, Option<String>>>, CsvParseError> { ... }
```

- [ ] **Step 3: Also add delimiter sniff** (comma vs semicolon) by scanning first 2 lines; commit.

### Task 5.2: Add `csv` + `strsim` dependencies

**Files:**

- Modify: `backend/Cargo.toml`

- [ ] **Step 1:** `cd backend && cargo add csv strsim async-trait`. `cargo check`. Commit.

### Task 5.3: S3 storage helpers

**Files:**

- Create: `backend/src/import/storage.rs`

- [ ] **Step 1: Test with mock S3 or skip-if-no-s3-config.**

- [ ] **Step 2: Implement** `put_csv(s3_client, bucket, session_id, filename, bytes) -> Result<String /* key */>` and `get_csv(...) -> Vec<u8>`. Key format: `imports/{session_id}/{filename}`.

- [ ] **Step 3: Commit.**

---

## Phase 6 — DTOs and API routes

### Task 6.1: DTOs

**Files:**

- Create: `backend/src/dto/import.rs`
- Modify: `backend/src/dto/mod.rs`

- [ ] **Step 1: Define response DTOs** mirroring the DB models but with snake_case JSON serialisation, plus request bodies: `UpdateMappingRequest { mapping: ImportMapping }`, `UpdateRowRequest { overrides: Option<Map>, resolved_refs: Option<Map>, skip: Option<bool> }`. Each with `ToSchema`.

- [ ] **Step 2: o2o conversions** from DB models. Commit.

### Task 6.2: Handler — upload

**Files:**

- Create: `backend/src/handlers/import.rs`
- Modify: `backend/src/handlers/mod.rs`
- Modify: `backend/src/lib.rs` (routes)
- Create: `backend/tests/import/handlers/upload.rs`

- [ ] **Step 1: Integration test** using `TestRouter::as_editor(pool)`. `multipart` POST a small CSV → expect 200 with `{ session_id, headers, preview, row_count }`. Assert row in `import_sessions` with status `mapping`.

- [ ] **Step 2: Implement** `POST /import/sessions`:

```rust
#[utoipa::path(post, path = "/import/sessions", ...)]
pub async fn upload_session(
    State(st): State<AppState>,
    _: EditorUser,
    mut mp: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    // Parse multipart: file + entity_type
    // Validate entity_type exists in registry
    // Parse CSV preview
    // Upload to S3 (if configured) or fail
    // Insert session + session_file
    // Return preview
}
```

- [ ] **Step 3: Wire route into `editor_routes()`. Commit.**

### Task 6.3: Handler — list / get session (+ rows)

- [ ] **TDD** `GET /import/sessions` (paginated), `GET /import/sessions/:id`, `GET /import/sessions/:id/rows?page=&limit=&status=`. Commit.

### Task 6.4: Handler — save mapping

- [ ] `PATCH /import/sessions/:id/mapping` — body `UpdateMappingRequest`. Writes to DB, sets status → `mapping`. Test invalid target field names → 400. Commit.

### Task 6.5: Handler — enqueue dry-run

- [ ] `POST /import/sessions/:id/dry-run` — sets status → `dry_run_pending`, notifies background worker (broadcast channel or DB polling). Returns 202. Test state transition. Commit.

### Task 6.6: Handler — update row

- [ ] `PATCH /import/rows/:id` — updates `overrides` / `resolved_refs` / skip. Re-validates this row synchronously (calls adapter's `validate_row`, `build_diff`). Returns updated row. Commit.

### Task 6.7: Handler — commit

- [ ] `POST /import/sessions/:id/commit` — refuses unless session `dry_run_ready`. Sets status → `committing`. Returns 202. Commit.

### Task 6.8: Handler — rollback / revert row / cancel

- [ ] `POST /import/sessions/:id/rollback`, `POST /import/rows/:id/revert`, `DELETE /import/sessions/:id`. Each TDD'd. Commit after each.

### Task 6.9: utoipa registration

- [ ] Add each handler into `ApiDoc` + OpenApiRouter like existing handlers. Run the backend, confirm `/api/openapi.json` includes the new paths. Commit.

---

## Phase 7 — Background worker

### Task 7.1: Worker scaffolding

**Files:**

- Create: `backend/src/import/worker.rs`

- [ ] **Step 1: Spawn a tokio task on startup** (in `lib.rs`) that loops: `SELECT id FROM import_sessions WHERE status IN ('dry_run_pending','committing') ORDER BY updated_at LIMIT 1 FOR UPDATE SKIP LOCKED`; processes the job; sleeps 1s. One job at a time keeps logic simple.

- [ ] **Step 2: Test** using an injected "run one iteration" function. Seed a pending session, run iteration, assert status moved to `dry_run_ready`.

### Task 7.2: Dry-run processor

- [ ] **Step 1:** Load session + file bytes from S3. Parse all rows (`parse_all`). Delete existing `import_rows` for this session. Bulk-insert fresh rows.

- [ ] **Step 2:** For each row: apply mapping → `ResolvedRow`, call `adapter.resolve_references` + `adapter.validate_row` + `adapter.lookup_existing` → if existing, call `adapter.build_diff` and set status `will_update`; else `will_create`. Error → `error`. Persist per-row.

- [ ] **Step 3:** On complete, set session status to `dry_run_ready`. On any fatal error, `failed` + `error` text.

- [ ] **Step 4: Integration test** with legacy productions CSV → verify per-row statuses + that a re-run is idempotent. Commit.

### Task 7.3: Commit processor

- [ ] **Step 1:** Iterate rows with status `will_create` / `will_update` / `pending`. For each: open a transaction; merge `raw_data + overrides + resolved_refs` → `ResolvedRow`; `adapter.apply_row` → capture id; commit tx; update row `status = created|updated`, `target_entity_id = id`. On row error: roll back its tx, mark `error`.

- [ ] **Step 2:** On finish, set session `committed`, `committed_at = now()`.

- [ ] **Step 3: Integration test** commits legacy CSV → asserts rows in productions table match CSV contents.

- [ ] **Step 4: Commit.**

### Task 7.4: Rollback processor

- [ ] Synchronous — runs inline inside the `rollback` handler (no need for background). Iterate rows reverse-chronologically with status `created|updated`, call `adapter.revert_row`. Partial failure tolerated (row keeps status + gets warning).

---

## Phase 8 — Frontend foundations

### Task 8.1: Regenerate API types

- [ ] Run backend locally; from `frontend/`: `npm run generate:api-types`. Confirm import-related paths appear in `src/types/api/generated.ts`. Commit generated file.

### Task 8.2: API aliases, domain models, mappers

**Files:**

- Create: `frontend/src/types/api/import.api.types.ts`
- Create: `frontend/src/types/models/import.types.ts`
- Create: `frontend/src/mappers/import.mapper.ts`
- Create: `frontend/test/unit/mappers/import.mapper.test.ts`

- [ ] **Step 1: API aliases** — one-liners pointing at the generated schemas.

```ts
import type { components } from './generated';
export type ImportSessionResponse = components['schemas']['ImportSession'];
export type ImportRowResponse = components['schemas']['ImportRow'];
export type FieldSpec = components['schemas']['FieldSpec'];
// ...etc
```

- [ ] **Step 2: Domain models** (`import.types.ts`) — camelCase variants of every API type.

- [ ] **Step 3: Mappers** — pure functions `toImportSession`, `toImportRow`, `toFieldSpec`, inverses for request bodies. Write unit test per mapper asserting round-tripping preserves key values.

- [ ] **Step 4: Commit.**

### Task 8.3: Query keys + hooks

**Files:**

- Modify: `frontend/src/hooks/api/query-keys.ts`
- Create: `frontend/src/hooks/api/useImport.ts`

- [ ] **Step 1: Add `imports` key factory**:

```ts
export const importKeys = {
  all: ['imports'] as const,
  sessions: () => [...importKeys.all, 'sessions'] as const,
  session: (id: string) => [...importKeys.sessions(), id] as const,
  rows: (sessionId: string) => [...importKeys.session(sessionId), 'rows'] as const,
  fieldSpec: (entityType: string) => [...importKeys.all, 'fields', entityType] as const,
};
```

- [ ] **Step 2: Hooks** — `useImportSessions`, `useImportSession`, `useImportRows`, `useFieldSpec`, `useCreateImportSession`, `useUpdateMapping`, `useStartDryRun`, `useUpdateRow`, `useCommitImport`, `useRevertRow`, `useRollbackSession`. Each via `useQuery` / `useMutation` with proper invalidation. Polling for active sessions: use `refetchInterval` that returns 1500ms while status ∈ {`dry_run_pending`, `committing`}, else `false`.

- [ ] **Step 3: Integration test** via MSW for at least `useImportSession` + `useStartDryRun`. Commit.

---

## Phase 9 — Frontend UI: upload + mapping

### Task 9.1: Page shell + stepper

**Files:**

- Modify: `frontend/src/app/[locale]/(cms)/cms/(main)/import/page.tsx` (replace placeholder)
- Create: `frontend/src/components/cms/import/ImportStepper.tsx`

- [ ] Replace the placeholder body with a stepper (Upload / Map / Dry-run / Commit). Stage derived from `status` of the active session (from URL `?session=<id>`, or nothing if at upload). Drive via local React state + `useImportSession`. Commit.

### Task 9.2: Upload stage

**Files:**

- Create: `frontend/src/components/cms/import/UploadStage.tsx`
- Create: `frontend/test/e2e/cms-import.spec.ts` (skeleton; grows through later phases)

- [ ] **Step 1: Dropzone** (native drag/drop or `<input type=file accept=".csv">`). Entity-type select (from `useFieldSpec` supported list or a static enum).

- [ ] **Step 2: On submit** — `useCreateImportSession.mutateAsync({ file, entityType })`. On success, push to `/cms/import?session=${id}`.

- [ ] **Step 3: Error states** — oversized file, unsupported entity type, parse error from backend.

- [ ] **Step 4: Unit test** renders + submits (MSW). Commit.

### Task 9.3: Mapping stage

**Files:**

- Create: `frontend/src/components/cms/import/MappingStage.tsx`
- Create: `frontend/src/components/cms/import/ColumnMapRow.tsx`
- Create: `frontend/src/lib/import/autoSuggestMapping.ts`
- Create: `frontend/test/unit/lib/import/autoSuggestMapping.test.ts`

- [ ] **Step 1: Auto-suggest logic** — pure function: `autoSuggestMapping(headers, fieldSpec)` returning `{ [header]: fieldName | null }`. Uses normalised Levenshtein against both `name` and `label`. Threshold 0.65.

```ts
export function autoSuggestMapping(
  headers: string[],
  fields: FieldSpec[]
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const h of headers) {
    const candidate = fields
      .map((f) => ({
        name: f.name,
        score: Math.max(similarity(h, f.name), similarity(h, f.label)),
      }))
      .sort((a, b) => b.score - a.score)[0];
    out[h] = candidate && candidate.score >= 0.65 ? candidate.name : null;
  }
  return out;
}
```

Write tests with legacy CSV headers → expect `Titel → title`, `Starttime → start_time`, `Hall → hall_id`, etc.

- [ ] **Step 2: UI** — left = headers with 3 sample values (from preview rows), right = field dropdowns. Required-but-unmapped fields show a red banner.

- [ ] **Step 3: Save + start dry-run button.**

- [ ] **Step 4: Commit.**

---

## Phase 10 — Frontend UI: dry-run

### Task 10.1: Summary cards + progress bar

- [ ] Summary counts derived from rows. Progress bar visible while `status === 'dry_run_pending'` (bar is indeterminate — backend doesn't emit per-row progress yet; acceptable for v1).

### Task 10.2: Row table (virtualised)

**Files:**

- Create: `frontend/src/components/cms/import/DryRunTable.tsx`

- [ ] Use `@tanstack/react-virtual` (already in project or add). Columns: row #, status badge, target link (if update), warning count, action (opens drawer). Click → open `RowDrawer`.

### Task 10.3: Row drawer

**Files:**

- Create: `frontend/src/components/cms/import/RowDrawer.tsx`
- Create: `frontend/src/components/cms/import/DiffView.tsx`
- Create: `frontend/src/components/cms/import/FkPicker.tsx`

- [ ] **DiffView:** per changed field, two columns (current vs incoming). Incoming is a controlled input; onBlur (debounced 400ms) fires `useUpdateRow.mutate({ overrides: { [field]: value } })`.

- [ ] **FkPicker:** per FK column with suggestions, list top 3 as buttons + a typeahead search (another hook: `useResolveReference(sessionId, rowId, column, query)`) + a "skip" option.

- [ ] **Skip row toggle.**

- [ ] **Commit flow** — buttons at stage footer: "Re-run dry-run" (only if mapping changed), "Commit".

### Task 10.4: Commit stage

- [ ] Loading spinner while status `committing`. On `committed` status, redirect to `/cms/import/history/[id]`.

### Task 10.5: Tests

- [ ] Unit tests for DiffView edit + FkPicker select. Commit.

---

## Phase 11 — History + rollback

### Task 11.1: History list page

**Files:**

- Create: `frontend/src/app/[locale]/(cms)/cms/(main)/import/history/page.tsx`
- Create: `frontend/src/components/cms/import/HistoryList.tsx`

- [ ] Paginated table. Link each row to `/cms/import/history/[id]`. Commit.

### Task 11.2: History detail page

**Files:**

- Create: `frontend/src/app/[locale]/(cms)/cms/(main)/import/history/[id]/page.tsx`
- Create: `frontend/src/components/cms/import/HistoryDetail.tsx`

- [ ] Reuses `DryRunTable` in read-only mode. Additional column: two links per row — "Edit in CMS" (to the CMS edit page for that entity type+id) and "View on site" (if entity has `slug` + published). Per-row **Revert** button. Page-level **Rollback entire import** button (with confirm dialog).

- [ ] Entity edit-page URL helper (`frontend/src/lib/import/entityLinks.ts`):

```ts
export function cmsEditUrl(entityType: string, id: string): string {
  switch (entityType) {
    case 'production':
      return `/cms/productions/${id}/edit`;
    case 'event':
      return `/cms/events/${id}/edit`;
    case 'article':
      return `/cms/articles/${id}/edit`;
    case 'location':
      return `/cms/locations/${id}/edit`;
    case 'artist':
      return `/cms/performers/${id}/edit`;
    default:
      throw new Error(`Unknown entity type ${entityType}`);
  }
}
```

### Task 11.3: Hook up rollback + single revert

- [ ] Call `useRevertRow` / `useRollbackSession`. On success invalidate row+session queries. Show toast per result. Commit.

---

## Phase 12 — Translations, e2e, polish

### Task 12.1: Add `nl` and `en` translation strings

**Files:**

- Modify: `frontend/src/messages/nl.json`
- Modify: `frontend/src/messages/en.json`

- [ ] Replace/extend `Cms.Import` with keys used by all stages. Commit.

### Task 12.2: Playwright E2E

**Files:**

- Modify: `frontend/test/e2e/cms-import.spec.ts`

- [ ] Full flow against mocked API (`mockApi.ts`): login as editor → navigate to `/cms/import` → upload fixture CSV → map → start dry-run → resolve one FK → edit one cell → commit → redirected to history → rollback. Asserts at each step. Commit.

### Task 12.3: Fixture CSVs for backend tests

**Files:**

- Create: `backend/tests/fixtures/import/legacy_productions.csv`
- Create: `backend/tests/fixtures/import/legacy_events.csv`

- [ ] Paste the legacy headers + ~5 representative rows each. Commit.

### Task 12.4: Backend end-to-end integration test

**Files:**

- Create: `backend/tests/import/end_to_end.rs`

- [ ] TestRouter-based test: upload fixture productions CSV → save mapping → start dry-run → wait for `dry_run_ready` → commit → wait for `committed` → assert `productions` rows exist with expected titles → rollback → assert rows gone. Commit.

### Task 12.5: Clippy + typecheck sweep

- [ ] `cargo clippy --all -- -D warnings` → fix. `npm --prefix frontend run typecheck` + `lint` → fix. `npm --prefix frontend run knip` → remove dead exports. Commit fixups.

### Task 12.6: Remove old placeholder `ingest` page if redundant

- [ ] Confirm with user whether `/cms/ingest` is still needed (same "coming soon" pattern). If not, remove + route deletion. Otherwise skip.

---

## Self-Review

Run through the spec and confirm each section is covered:

- Schema (3 tables) → Task 1.1.
- Legacy ID columns → Task 0.2.
- Trait + registry → Phase 3.
- Production/Event adapters → Phase 4.1–4.8.
- Stub adapters → 4.9.
- CSV parsing + S3 storage → Phase 5.
- All 10 API routes → Phase 6.
- Background jobs → Phase 7.
- Frontend foundations (types/mappers/hooks) → Phase 8.
- Four-stage UI (upload/map/dry-run/commit) → Phases 9–10.
- History + rollback → Phase 11.
- Tests (backend/frontend/E2E) → distributed; consolidated in Phase 12.
- Legacy CSV compatibility → Phase 12.3 + 12.4.

No placeholders, no "TBD"s, no "similar to Task N" hand-waves.
