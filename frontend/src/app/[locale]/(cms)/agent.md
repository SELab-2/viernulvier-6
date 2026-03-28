# CMS Agent Map

> Keep this file up to date whenever you add, move, rename, or delete files in the CMS.
> It is the authoritative snapshot of the CMS structure — read it instead of grepping the codebase.

---

## Route groups overview

```
src/app/[locale]/(cms)/
├── layout.tsx                   Simple full-height flex container (no chrome)
└── cms/
    ├── layout.tsx               Root CMS layout — mounts <CmsTabBar> at the top
    ├── cms-tab-bar.tsx          Top-level tab bar: Overview | Content | Ingest | Import
    │
    ├── (main)/                  Non-entity pages (no sidebar)
    │   ├── layout.tsx           Wraps tab bar + scrollable main area
    │   ├── page.tsx             /cms — Overview (placeholder)
    │   ├── ingest/page.tsx      /cms/ingest — Bulk media import
    │   └── import/page.tsx      /cms/import — Marketing-site import status
    │
    ├── (content)/               Entity list pages (sidebar nav)
    │   ├── layout.tsx           Sidebar + entity page layout
    │   ├── articles/page.tsx    /cms/articles — renders <ArticlesTable>
    │   ├── productions/page.tsx /cms/productions — renders <ProductionsTable>
    │   ├── locations/page.tsx   /cms/locations — renders <LocationsTable>
    │   └── performers/page.tsx  /cms/performers — renders <PerformersTable> (stub)
    │
    ├── (editor)/                Full-page editors (no sidebar, overflow hidden)
    │   ├── layout.tsx
    │   └── articles/[id]/edit/
    │       ├── page.tsx                 Server component — passes `id` to client
    │       └── article-editor-page.tsx  Client: Tiptap editor + metadata panel + save
    │
    └── tables/                  Shared table primitives + per-entity table modules
        ├── data-table.tsx        TanStack Table wrapper; supports expandable sub-rows
        ├── edit-sheet.tsx        Generic side-sheet form (text | boolean | select fields)
        ├── actions-column.tsx    Column factory: copy / edit / delete action buttons
        ├── boolean-cell.tsx      Read-only boolean display cell
        │
        ├── articles/
        │   ├── columns.tsx       Column defs — status badge, title, actions, editor link
        │   └── articles-table.tsx  List + create mutations; navigates to editor on edit
        │
        ├── productions/
        │   ├── columns.tsx         Production row columns + edit-sheet field config
        │   ├── event-columns.tsx   Nested event row columns + edit-sheet field config
        │   └── productions-table.tsx  Expandable rows: production → events
        │
        ├── locations/
        │   ├── columns.tsx         Location row columns + edit-sheet field config
        │   ├── hall-columns.tsx    Nested hall row columns + edit-sheet field config
        │   └── locations-table.tsx   Expandable rows: location → halls
        │
        └── performers/
            ├── columns.tsx           Performer columns (static, API pending)
            └── performers-table.tsx  Empty-state placeholder
```

---

## Shared CMS components

```
src/components/cms/
├── tiptap-editor.tsx          Rich text editor (Tiptap + StarterKit). Disabled: code, codeBlock.
├── editor-toolbar.tsx         Toolbar for tiptap-editor: bold, italic, strike, h1-h3,
│                              bullet/ordered list, blockquote, hr, link popover.
├── article-metadata-panel.tsx Side panel: status select (colored trigger), slug, subject period,
│                              related productions/locations/events (checkbox multi-select).
└── status-badge.tsx           Pill badge for ArticleStatus (published/draft/archived).
                               Color map: published=green, draft=yellow, archived=gray.
```

---

## Data layer (CMS-relevant files)

### API hooks — `src/hooks/api/`

| File                | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `useArticles.ts`    | list, byId, relations, create, update                   |
| `useArtists.ts`     | list (read-only, CMS selectors)                         |
| `useProductions.ts` | list, create, update                                    |
| `useLocations.ts`   | list, create, update                                    |
| `useEvents.ts`      | list, create, update                                    |
| `useHalls.ts`       | list, create, update                                    |
| `useEditors.ts`     | create editor (admin only)                              |
| `useSpaces.ts`      | list (read-only)                                        |
| `useTaxonomy.ts`    | list (read-only)                                        |
| `query-keys.ts`     | React Query key factory — use for consistent cache keys |
| `index.ts`          | Barrel export                                           |

### Types — `src/types/`

- `api/*.api.types.ts` — raw API response shapes (suffix: `Response`) and request shapes (suffix: `Request`)
- `models/*.types.ts` — domain model types used in UI (e.g. `Article`, `ArticleStatus`)
- `api/generated.ts` — auto-generated from backend schema; do not edit by hand
- **Note:** `ArticleUpdateRequest` deliberately excludes `id`, `created_at`, `updated_at`; backend sets `updated_at` and takes `id` from the URL path (`PUT /articles/{id}`).

### Mappers — `src/mappers/`

One mapper per entity. Converts `*Response` → domain model and builds create/update input DTOs.
Pattern: `article.mapper.ts` exports `mapArticle(r: ArticleResponse): Article` etc.
`utils.ts` — shared mapper utilities (`toNullable`). Import from here instead of redefining locally.

---

## Key patterns

### EditSheet

`tables/edit-sheet.tsx` — generic side panel for in-place editing.
Pass a `fields` array of `{ key, label, type: "text" | "boolean" | "select" }`.
Used by all entity tables; do not duplicate per-entity edit sheets.

### DataTable

`tables/data-table.tsx` — TanStack Table v8 wrapper.
Supports `getSubRows` for nested expandable rows (productions→events, locations→halls).
Sub-tables are memoized to avoid re-renders.

### Mapper → Hook → Table flow

```
API (JSON)
  → mapper (toModel)
    → React Query hook (cached)
      → columns.tsx (display + edit-sheet field config)
        → *-table.tsx (mutations wired)
```

### Adding a new entity

1. Add `api/*.api.types.ts` and `models/*.types.ts`
2. Add `mappers/*.mapper.ts`
3. Add `hooks/api/use*.ts` (follow existing pattern, register key in `query-keys.ts`)
4. Add `tables/<entity>/columns.tsx` + `<entity>-table.tsx`
5. Add `(content)/<entity>/page.tsx`
6. Wire into sidebar nav in `(content)/layout.tsx`
7. **Update this file.**
