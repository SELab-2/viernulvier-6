# CSV Importer: Bug Fixes + New Adapters

**Date**: 2026-05-17  
**Branch**: `cms/data-import`

---

## Scope

Three bugs in the existing CSV importer plus three new entity adapters.

---

## Bug 1 — `will_skip` rows never finalized to `skipped` (Backend)

### Root cause

`worker.rs:process_commit` filters actionable rows to `WillCreate | WillUpdate | Pending`. After the per-row loop, `will_skip` rows remain in that status forever — neither `mark_session_committed` nor `mark_session_failed_after_commit` touches them.

### Consequences

- History detail shows 0 skipped (reads `rowStats.skipped`, which is correct, but rows are still in `will_skip`)
- Individual row status in history shows `will_skip` instead of `skipped`
- `CommitStage.tsx` already works around this with `rowStats.skipped + rowStats.willSkip` in the partial-fail message — a symptom of the root cause not being fixed

### Fix

**File**: `backend/database/src/repos/import.rs`  
Add a new repo method:

```rust
pub async fn finalize_skipped_rows(&self, session_id: Uuid) -> Result<u64, DatabaseError> {
    // UPDATE import_rows SET status = 'skipped'
    // WHERE session_id = $1 AND status = 'will_skip'
}
```

**File**: `backend/src/import/worker.rs`  
In `process_commit`, after the per-row loop and before `mark_session_committed` / `mark_session_failed_after_commit`, call:

```rust
db.imports().finalize_skipped_rows(id).await?;
```

**File**: `frontend/src/components/cms/import/CommitStage.tsx`  
Remove the `rowStats.skipped + rowStats.willSkip` workaround — use `rowStats.skipped` alone.

---

## Bug 2 — `will_create` count jumps +100 immediately after "Import Without Overriding" (Frontend)

### Root cause

In `DryRunStage.tsx`, the `counts` object uses `resolvedRows.filter(r => r.status === "will_create").length` as a fallback when `rowStats` is undefined. `resolvedRows` is the current page (max `PAGE_SIZE = 100` rows), so this is a page-level count masquerading as a session-level count.

The fallback fires because `useImportRowStats` has `enabled: Boolean(session)`. After `skipUpdateRows.onSuccess` invalidates the session query, there is a brief React render cycle where `session.data` is in flux, making `enabled` flicker to false and clearing `rowStats.data`.

### Fix

**File**: `frontend/src/components/cms/import/DryRunStage.tsx`  
Replace all `?? resolvedRows.filter(...)` fallbacks in the `counts` object with `?? 0`:

```ts
const counts = {
  all: rowStats?.total ?? session?.rowCount ?? resolvedRows.length,
  will_create: rowStats?.willCreate ?? 0,
  will_update: rowStats?.willUpdate ?? 0,
  will_skip: rowStats?.willSkip ?? 0,
  error: rowStats?.error ?? 0,
};
```

`counts.all` keeps `session?.rowCount` and `resolvedRows.length` as safe fallbacks (both are stable numbers that do not depend on the page's row statuses). The per-status counts must never fall back to page-level filtering.

---

## Bug 3 — History/messages display incorrect field counts

This is the user-visible symptom of Bug 1. Fixed entirely by Bug 1's backend finalization. No additional frontend changes needed beyond removing the `CommitStage` workaround.

---

## New Adapters

Three new files in `backend/src/import/adapters/`. All follow the same pattern as `ProductionImport`. No FK fields for any of them (standalone entities).

### Artist adapter (`adapters/artist.rs`)

- `entity_type`: `"artist"`
- Fields:
  - `name` — required, `unique_lookup: true` (fuzzy-match lookup)
- `lookup_existing`: slugify incoming `name`, call `db.artists().search(Some(name))`, fuzzy-match by Jaro-Winkler, return best match UUID if score > threshold (0.85)
- `resolve_references`: returns default (empty)
- `validate_row`: `name` required, non-empty
- `build_diff`: compare `name` field
- `apply_row`:
  - Create: `db.artists().insert(name, slugify(name))` — if slug conflict, append `-2`, `-3`, etc.
  - Update: `db.artists().update(id, name, existing.slug)` — slug is stable
- `revert_row`: `db.artists().delete(entity_id)`

### Location adapter (`adapters/location.rs`)

- `entity_type`: `"location"`
- Fields:
  - `source_id` — optional, `unique_lookup: true`
  - `name` — optional
  - `city` — optional
  - `street` — optional
  - `number` — optional
  - `postal_code` — optional
  - `country` — optional
  - `code` — optional
  - `phone_1` — optional
  - `phone_2` — optional
- `lookup_existing`: by `source_id` via `db.locations().by_source_id(sid)` — returns `Ok(None)` if no source_id
- `resolve_references`: returns default (empty)
- `validate_row`: no required fields (mirrors existing Location model), but emit a warning if all fields are empty
- `build_diff`: compare all scalar fields against `db.locations().by_id(entity_id)`
- `apply_row`:
  - Create: `db.locations().insert(LocationCreate { ... }, vec![])` — no translation data in v1
  - Update: load existing, merge incoming fields (non-null incoming wins), `db.locations().update(location, vec![])`
- `revert_row`: `db.locations().delete(entity_id)`

### Article adapter (`adapters/article.rs`)

- `entity_type`: `"article"`
- Fields:
  - `title` — required
  - `slug` — optional, `unique_lookup: true`
  - `status` — optional, one of `draft | published | archived`, defaults to `draft` on create
  - `subject_period_start` — optional, date (YYYY-MM-DD)
  - `subject_period_end` — optional, date (YYYY-MM-DD)
- `lookup_existing`: by `slug` via `db.articles().by_slug(slug)` — returns `Ok(None)` if no slug
- `resolve_references`: returns default (empty)
- `validate_row`:
  - `title` required, non-empty
  - `status` must be `draft`, `published`, or `archived` if present
  - `subject_period_start` / `_end` must parse as `YYYY-MM-DD` if present
- `build_diff`: compare `title`, `slug`, `status`, `subject_period_start`, `subject_period_end`
- `apply_row`:
  - Create: `db.articles().insert(ArticleCreate { slug: incoming_slug_or_slugified_title, title, status, ... })`
  - Update: load existing, merge fields, `db.articles().update(article)` — slug is stable on update
- `revert_row`: `db.articles().delete(entity_id)`

### Registry

**File**: `backend/src/import/mod.rs`  
Add three new entries to `default_registry()`:

```rust
Arc::new(adapters::artist::ArtistImport),
Arc::new(adapters::location::LocationImport),
Arc::new(adapters::article::ArticleImport),
```

---

## Files Changed

| File                                                 | Change                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `backend/database/src/repos/import.rs`               | Add `finalize_skipped_rows`                              |
| `backend/src/import/worker.rs`                       | Call `finalize_skipped_rows` before session finalization |
| `backend/src/import/adapters/artist.rs`              | New                                                      |
| `backend/src/import/adapters/location.rs`            | New                                                      |
| `backend/src/import/adapters/article.rs`             | New                                                      |
| `backend/src/import/adapters/mod.rs`                 | `pub mod` declarations for three new adapters            |
| `backend/src/import/mod.rs`                          | Register three new adapters in `default_registry()`      |
| `frontend/src/components/cms/import/DryRunStage.tsx` | Fix `counts` fallbacks                                   |
| `frontend/src/components/cms/import/CommitStage.tsx` | Remove `willSkip` workaround                             |

---

## Out of scope

- Article–production / article–artist FK relations via CSV (M:N, deferred)
- Location translations in CSV import (v1 only imports scalar fields)
- Slug collision handling beyond simple suffix increment for artists
