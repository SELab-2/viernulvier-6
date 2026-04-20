# CSV Import System — Design

**Date:** 2026-04-19
**Route:** `/nl/cms/import`
**Status:** Approved, pending implementation plan

## Goal

Replace the placeholder `/cms/import` page with a generic CSV import system that works for any entity type in the archive (productions, events, articles, locations, artists), with dry-run preview, inline editing, fuzzy-matched cross-entity references, persisted history, and per-row undo.

The system must handle the legacy CSVs:

- **Productions — output.csv**: `Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID`
- **Events — voorstellingen.csv**: `Starttime,Endtime,Hall,Production`

## Scope (v1)

**In:**

- Production and Event adapters fully implemented.
- Article / Location / Artist adapters stubbed (registered but return "not yet supported").
- Generic per-entity pipeline: upload → map → dry-run → commit → history/undo.
- Persisted dry-runs (user can leave and return).
- Fuzzy FK resolution with inline picker.
- Per-row diff view and inline editing.
- Background jobs with live progress.
- Import history with per-row entity links and rollback.

**Out (YAGNI for v1):**

- Savable mapping templates.
- Multi-select / tag column parsing (treated as plain text).
- Rich-text / HTML column parsing.
- Image or media upload via CSV.
- Concurrent-import locking (warning only).
- External sources (UiTdatabank) — only CSV.

## Architecture

### Backend: `backend/src/import/`

New module. Defines the `ImportableEntity` trait:

```rust
pub trait ImportableEntity: Send + Sync {
    fn entity_type(&self) -> &'static str;
    fn target_fields(&self) -> Vec<FieldSpec>;
    async fn lookup_existing(&self, row: &ResolvedRow, db: &Database) -> Result<Option<Uuid>>;
    async fn resolve_references(&self, row: &RawRow, db: &Database) -> Result<ReferenceResolution>;
    fn validate_row(&self, row: &ResolvedRow) -> Vec<Warning>;
    async fn apply_row(&self, row: &ResolvedRow, db: &Database, tx: &mut Tx) -> Result<Uuid>;
    async fn revert_row(&self, entity_id: Uuid, db: &Database, tx: &mut Tx) -> Result<()>;
}
```

Concrete impls for v1: `ProductionImport`, `EventImport`. Stubs for Article, Location, Artist.

A registry (`HashMap<&'static str, Arc<dyn ImportableEntity>>`) resolves entity type strings to adapters.

### Background jobs

In-process tokio task spawned per dry-run / commit, polling `import_sessions` for queued work. No external queue. Frontend polls `GET /import/sessions/:id` for live progress.

### Frontend

Four-stage flow under `/[locale]/(cms)/cms/(main)/import/`:

1. Upload
2. Map columns
3. Dry-run review
4. Commit + redirect to history detail

Plus:

- History list page (all past imports).
- History detail page (per-row status + revert).

## Database schema

New migration in `backend/migrations/`.

```sql
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_headers TEXT[] NOT NULL,
  mapping JSONB NOT NULL,
  status TEXT NOT NULL,
    -- uploaded | mapping | dry_run_pending | dry_run_ready
    -- | committing | committed | failed | cancelled
  row_count INT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE import_rows (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}',
  resolved_refs JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
    -- pending | will_create | will_update | will_skip
    -- | error | created | updated | skipped | reverted
  target_entity_id UUID,
  diff JSONB,
  warnings JSONB NOT NULL DEFAULT '[]',
  UNIQUE (session_id, row_number)
);

CREATE TABLE import_session_files (
  session_id UUID PRIMARY KEY REFERENCES import_sessions(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL
);
```

### Storage semantics

- Raw CSV file uploaded to Garage/S3 under `imports/{session_id}/{filename}`.
- `raw_data` holds the original CSV cells for that row, keyed by header.
- `overrides` holds user edits made during dry-run review; merged over `raw_data` at commit time.
- `resolved_refs` holds the user's chosen UUID for each fuzzy-matched FK column.
- `diff` is recomputed on every dry-run refresh; holds `{ field: { current, incoming } }` for update rows.

## User flow

### Stage 1 — Upload

- Dropzone (`.csv` only).
- Entity type selector (radio or select).
- On submit:
  1. Upload file to S3 (`imports/` prefix).
  2. Backend parses header row + first ~20 rows synchronously for preview.
  3. Creates `import_sessions` row (`status = mapping`), `import_session_files` row.
  4. Returns session id → navigate to Stage 2.

### Stage 2 — Map columns

- Two-column layout: left = CSV columns, right = target entity fields.
- Each CSV column row shows: header, 3 sample values, target-field dropdown with auto-suggested match preselected (Levenshtein distance on normalised header strings).
- Unmapped columns allowed (ignored).
- Required target fields flagged; warning if unmapped.
- On **Start dry run**: persist mapping to session, enqueue dry-run job, move to Stage 3.

### Stage 3 — Dry run

- Top: summary cards (create / update / skip / warnings / errors) + live progress bar while job runs.
- Body: virtualised table of all CSV rows.
  - Columns: row #, status badge, target entity link (for updates), warning count, action button.
  - Click row → side drawer.
- Drawer contents:
  - **Diff view**: side-by-side per field. Current DB value (read-only) vs incoming value (editable → writes to `overrides`).
  - **Unresolved FK picker** per fuzzy-matched column: top 3 suggestions + search box + "skip reference" option → writes to `resolved_refs`.
  - **Skip row** toggle.
- Any edit triggers a server-side re-validation of that row; summary updates.
- Actions: **Re-run dry run** (after mapping change), **Commit import**, **Cancel**.

### Stage 4 — Commit

- Enqueues commit job. One transaction per row (not per import) — partial success allowed.
- Live progress bar; on completion, redirect to history detail page.

### History

- **List**: table of past imports — entity type, filename, counts, status, user, date.
- **Detail**: same row table as dry-run (read-only). Each row has:
  - Link to CMS edit page of the created/updated entity.
  - Link to public site page (if entity is published).
  - **Revert** button per row.
- Page-level **Rollback entire import** button iterates rows reverse-order, calling `revert_row` on the adapter.

## Error handling

- **CSV parse failure** (malformed quotes, encoding, wrong delimiter): caught at upload; session marked `failed` with error before reaching mapping.
- **Per-row validation errors** during dry-run: row status = `error`, warnings list populated; other rows proceed.
- **Commit errors**: per-row transaction — failed rows flip to `error` with DB error message; sibling rows still commit.
- **Revert errors** (e.g. entity edited post-import, FK dependency): row stays `created`/`updated`, warning added about revert failure.

## Auth

- All import routes require `Editor` role.
- History is visible to all Editors (not just the creator).

## API surface (new routes)

All under `/import`, `Editor`-gated unless noted.

- `POST /import/sessions` — upload CSV, returns session + preview.
- `GET /import/sessions` — list history.
- `GET /import/sessions/:id` — session metadata + rows (paginated).
- `PATCH /import/sessions/:id/mapping` — save column mapping.
- `POST /import/sessions/:id/dry-run` — enqueue dry-run job.
- `PATCH /import/rows/:id` — update overrides / resolved_refs / skip.
- `POST /import/sessions/:id/commit` — enqueue commit job.
- `POST /import/sessions/:id/rollback` — revert every committed row.
- `POST /import/rows/:id/revert` — revert single row.
- `DELETE /import/sessions/:id` — cancel / discard.

## Frontend layers

Per project conventions (see `CLAUDE.md`):

- Generated types: `src/types/api/generated.ts` (auto).
- API aliases: `src/types/api/import.api.types.ts`.
- Domain models: `src/types/models/import.types.ts`.
- Mappers: `src/mappers/import.mapper.ts`.
- Hooks: `src/hooks/api/useImport.ts`, query keys in `src/hooks/api/query-keys.ts`.
- Components: `src/components/cms/import/` (Dropzone, MappingTable, DryRunTable, RowDrawer, DiffView, FkPicker, HistoryList).

## Testing

### Backend

- Unit tests per `ImportableEntity` impl: lookup, resolve_references, validate, apply, revert.
- Integration tests (`backend/tests/import/`) covering full upload → map → dry-run → commit → rollback flow against real Postgres, using the two legacy CSVs as fixtures in `tests/fixtures/import/`.
- Contract tests verify generated OpenAPI types still match frontend aliases.

### Frontend

- Unit: mapping auto-suggest logic; diff rendering; mappers.
- Integration: hooks against MSW; polling behaviour during dry-run/commit.
- E2E (Playwright): upload legacy productions CSV → map → dry-run → commit → verify entities exist → rollback → verify entities gone.

Coverage target: 80%+ (project standard).

## Legacy CSV compatibility

### Productions (`Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID`)

Auto-suggested mapping:

- `Titel` → `title`
- `Ondertitel` → `subtitle`
- `Description1` → `description_nl` (or primary description field)
- `Description2` → `description_en` (best guess; user overrides if wrong)
- `Genre` → `genre` (plain text v1)
- `ID` → `legacy_id` (requires backend field; see Open Questions)
- `Planning ID` → `legacy_planning_id` (same)

### Events (`Starttime,Endtime,Hall,Production`)

Auto-suggested mapping:

- `Starttime` → `start_time` (parsed as timestamp)
- `Endtime` → `end_time`
- `Hall` → `location_id` (fuzzy-matched against `locations.name`)
- `Production` → `production_id` (fuzzy-matched against `productions.title`)

## Open questions (for implementation plan)

1. Do `productions` and `events` already have `legacy_id` / `legacy_planning_id` columns? If not, migration must add them (nullable, indexed).
2. Preferred header-similarity algorithm (Levenshtein vs Jaro-Winkler) — pick one in the plan.
3. Row-level re-validation during drawer edits: debounce interval (e.g. 300ms) — pick in plan.
4. Max CSV size for v1 — suggest 10 MB / 50k rows as a starting cap.
