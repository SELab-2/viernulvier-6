# feat(cms): generic CSV import with dry-run, commit, and revertible history

Adds a full CSV import flow at `/cms/import` that lets editors upload any CSV, map its columns to entity fields, review a persisted dry run, commit, and revert — per row or as a whole session. Supports productions, events, artists, locations, and articles; generic over entity types; purely additive to the existing database schema.

## Summary

- **Generic CSV pipeline**: one UI + one backend trait (`ImportableEntity`) drive imports for any entity type via per-entity adapters behind a small `ImportRegistry`.
- **Four-stage flow** in the CMS: **Upload → Map → Dry Run → Commit**, plus a **History** section with per-row revert and full session rollback.
- **Five entity adapters**: production, event, artist, location, article — stub adapters for unfinished types are registered but hidden from the upload dropdown via `importable() -> bool`.
- **Purely additive schema**: three new tables (`import_sessions`, `import_rows`, `import_session_files`). Existing entity tables are untouched — duplicate detection reuses their existing `source_id` or name columns.
- **Atomic writes**: every adapter uses a `&mut Transaction<'_, Postgres>` for all entity writes so the entity creation/update and the import-row status update commit together or not at all.
- **Safe by default**: every commit is preceded by a persisted dry run; every committed row stores its diff so it can be reverted; per-row transactions mean partial failures are recoverable.
- **Revertible history**: committed sessions can be deleted from history — the backend rolls back all created/updated entities (strict mode, aborts on first failure) before deleting the session record. Per-row revert of `updated` rows warns that deletion is permanent.
- **Background worker**: a tokio task polls `import_sessions.status` for `dry_run_pending` / `committing` rows — no new message queues, Redis, or services.
- **Legacy CSV support**: the `Productions - output.csv` (`Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID`) and `voorstellingen.csv` (`Starttime,Endtime,Hall,Production`) files import cleanly, with fuzzy-matched column suggestions.
- **Docs**: new `/docs/import` section with a user guide and an architecture deep-dive.

## Why

Editors have historical CSVs (and vendor exports) that currently require engineering help to get into the archive. This PR turns that into a self-serve flow while keeping enough safety rails (dry run, per-row revert, full rollback, committed-session delete) that mistakes are easy to undo.

## Scope

### Backend (Rust / Axum / SQLx)

- **New module `backend/src/import/`**: `trait_def.rs`, `registry.rs`, `types.rs`, `csv_parser.rs`, `storage.rs`, `worker.rs`, `adapters/{production,event,artist,location,article,stub}.rs`.
- **`ImportableEntity` trait** — `entity_type`, `target_fields`, `importable` (default `true`; stubs return `false`), `lookup_existing`, `resolve_references`, `validate_row`, `build_diff`, `apply_row`, `revert_row`.
- **TX atomicity** — all five repo families (`article`, `artist`, `event`, `location`, `production`) have `*_on(conn: &mut PgConnection, ...)` variants; all five adapters use `&mut *tx` for writes so entity mutation and row-status update are one atomic unit.
- **New HTTP surface** under `EditorUser` auth (all tagged `import` in OpenAPI, visible in Swagger UI):
  - `POST /import/sessions` — multipart CSV upload, creates session, stores blob on Garage S3.
  - `GET /import/entity-types` — returns only `importable()` adapters, sorted.
  - `GET /import/fields/{entity_type}`, `GET /import/sessions`, `GET /import/sessions/{id}`, `GET /import/sessions/{id}/rows`, `GET /import/sessions/{id}/stats`.
  - `PATCH /import/sessions/{id}/mapping` — persist column→field mapping.
  - `POST /import/sessions/{id}/dry-run`, `POST /import/sessions/{id}/commit` — enqueue work (202 Accepted).
  - `PATCH /import/rows/{id}` — inline override / resolved-ref edits, synchronously re-validated.
  - `POST /import/rows/{id}/revert`, `POST /import/sessions/{id}/rollback`.
  - `DELETE /import/sessions/{id}` — cancel incomplete session (transition to `cancelled`).
  - `DELETE /import/sessions/{id}/delete` — hard-delete from history; calls `rollback_committed_rows(..., strict=true)` for `committed` and `failed+committedAt` sessions before deleting.
- **New database layer**: migration + `ImportSessionRow` / `ImportRow` models + `repos/import.rs` with compile-time-checked SQL.
- **Background worker** started on `AppState` construction; atomic CAS claim of the next queued session.

### Frontend (Next.js 16 / React 19 / TanStack Query)

- **Strict type pipeline**: `types/api/import.api.types.ts` (OpenAPI aliases) → `mappers/import.mapper.ts` (snake↔camel) → `types/models/import.types.ts` (domain).
- **Hooks**: `hooks/api/useImport.ts` exposing `useUploadSession`, `useImportSession`, `useImportSessions`, `useImportRows`, `useImportRowStats`, `useUpdateMapping`, `useEnqueueDryRun`, `useUpdateRow`, `useEnqueueCommit`, `useRevertRow`, `useRollbackSession`, `useCancelSession`, `useDeleteImportSession`.
- **UI components** in `components/cms/import/`: `ImportStepper`, `UploadStage`, `MappingStage`, `DryRunStage`, `DryRunTable`, `DryRunSummary`, `RowDrawer`, `DiffView`, `FkPicker`, `CommitStage`, `HistoryList`, `HistoryDetail`, shared `statusBadge`/`sessionStatusBadge`.
- **Pages**: `/cms/import` (main flow), `/cms/import/history`, `/cms/import/history/[id]`.
- **Fuzzy auto-suggest** mapping via Levenshtein distance (`lib/import/autoSuggestMapping.ts`, threshold `0.65`).
- **History list**: committed sessions appear with a delete action; `window.confirm` with tailored copy per status (`deleteConfirmCommitted` warns that updated entities cannot be restored).
- **History detail Danger Zone**: committed sessions show both **Rollback** (keeps history record, marks session `cancelled`) and **Delete** (hard-delete with entity rollback); the Delete button opens a Dialog showing exactly how many created/updated entities will be permanently removed; reverting an `updated` row requires a separate `window.confirm` explaining the deletion is permanent.
- **Fixed rollback copy**: the rollback confirmation previously said "updated rows will be restored" — they are in fact deleted. Both locales corrected.
- **i18n**: ~70 new keys across `Cms.Import.*` in both `nl.json` and `en.json`, with natural-Dutch phrasing.

### Docs

- `docs/content/docs/import/index.mdx` — user guide (how to upload, map, dry-run, commit, revert).
- `docs/content/docs/import/architecture.mdx` — architecture deep-dive (tables, trait/registry, worker, four-stage UI, type contract, HTTP surface, extension points).
- `docs/content/docs/meta.json` updated to expose the new section in the sidebar.

### Tests

- **Backend unit**: adapter helpers, CSV parser, resolved-row builder.
- **Backend integration**: `import_worker_dry_run.rs`, `import_worker_commit.rs` driving the worker in-process against Postgres.
- **Backend end-to-end**: `import_end_to_end.rs` + legacy fixtures (`tests/fixtures/import/legacy_productions.csv`, `legacy_events.csv`) covering upload → dry-run → commit → rollback.
- **Frontend unit** (Vitest + Testing Library): every stage and table component, DiffView, FkPicker, ImportStepper, HistoryList, HistoryDetail, mapper, entity-links, auto-suggest.
- **Frontend integration**: MSW handlers in `test/msw/handlers/import.handlers.ts`; hooks covered by `test/integration/hooks/useImport.test.tsx`.
- **Frontend contract**: `expectTypeOf` assertions pin the generated OpenAPI types against the frontend aliases.
- **Frontend E2E**: Playwright smoke test for the import page and stepper.

## Notable design choices

- **Reuse `source_id`** on existing entity tables for legacy-ID duplicate detection — no `ALTER TABLE` anywhere.
- **The status column is the queue.** The worker polls `import_sessions.status` rather than introducing a job framework.
- **`importable()` on the trait, not a separate list.** Stub adapters stay registered (so historical sessions with those entity types can still be loaded) but return `false` so they are excluded from the upload dropdown and `GET /import/entity-types`.
- **Strict rollback before hard-delete.** When an editor deletes a committed session the backend rolls back all created/updated rows; if any revert fails the whole delete is aborted (`strict=true`). This prevents orphaned entities with no history record. The lenient (`strict=false`) path is reserved for the Rollback action that keeps the session alive so per-row failures are visible.
- **Overrides are their own column.** Inline edits go in `overrides JSONB`, keeping `raw_data` immutable for audit.
- **Per-row transactions.** Partial commits are recoverable; rollbacks tolerate per-row failures with a `revert_failed` warning and continue.
- **Persisted dry runs.** Dry-run status/diffs/warnings live in the DB so an editor can walk away and commit later without re-running.
- **shadcn `Dialog`, not `AlertDialog`**: the latter doesn't exist in this codebase; rollback/delete confirmations are built on the Dialog primitive already present.

## Follow-ups (not in this PR)

- Extend the Playwright suite to cover the full flow (upload → map → dry-run → commit → rollback) against the mocked API.
- Decide on mapping for the legacy `Planning ID` column — currently unmapped, tracked as an open question in the design spec.

<img width="1680" height="837" alt="image" src="https://github.com/user-attachments/assets/116c178d-dc53-48d1-b660-1c220fea40bf" />
<img width="1894" height="961" alt="image" src="https://github.com/user-attachments/assets/89fb1fcc-b09e-44e3-a710-6990b9bce0d7" />
<img width="1884" height="980" alt="image" src="https://github.com/user-attachments/assets/6167e259-f50e-40f2-b8ed-5369378f4dcd" />
<img width="709" height="964" alt="image" src="https://github.com/user-attachments/assets/06ce820e-1a27-453e-987c-2ed7ded1000d" />
<img width="1912" height="958" alt="image" src="https://github.com/user-attachments/assets/86c767b2-2a2a-4280-8219-56ed4e6c131d" />
<img width="1886" height="927" alt="image" src="https://github.com/user-attachments/assets/240b0d44-35c8-4462-be28-a99f09f2b9a6" />
<img width="1661" height="882" alt="image" src="https://github.com/user-attachments/assets/702cbfa6-4da2-4857-bc0d-ae0281a48326" />
