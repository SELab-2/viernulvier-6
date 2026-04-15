# CMS

Entry point is `layout.tsx`, which wraps all CMS routes.

## Route structure

```
cms/
  layout.tsx              wraps everything

  (overview)/
    page.tsx              /cms → overview (no sidebar)

  (content)/
    layout.tsx            sidebar (CmsSidebar), wraps entity routes
    productions/page.tsx  /cms/productions
    locations/page.tsx    /cms/locations
    articles/page.tsx     /cms/articles
    performers/page.tsx   /cms/performers
    articles/[id]/edit/   article editor (with sidebar)

  (main)/
    layout.tsx            sidebar (CmsSidebar), wraps utility routes
    collections/page.tsx  /cms/collections
    ingest/page.tsx       /cms/ingest
    import/page.tsx       /cms/import
```

The sidebar (`CmsSidebar`) reads `usePathname` to set the active item and uses `@/i18n/routing` for locale-aware navigation.

## tables/

```
data-table.tsx          reusable TanStack Table wrapper, handles expand/collapse
actions-column.tsx      factory: makeActionsColumn({ actions })
edit-sheet.tsx          generic EditSheet<TData> + FieldDef<TData> type
selection-toolbar.tsx   newspaper-styled bulk selection toolbar

productions/
  columns.tsx           makeProductionColumns({ onEdit, t, locale }) + productionFields
  event-columns.tsx     makeEventColumns({ onEdit, t }) + eventFields
  productions-table.tsx data via useGetProductions + useGetEvents, wired to mutations

locations/
  columns.tsx           makeLocationColumns({ onEdit, t }) + locationFields
  hall-columns.tsx      makeHallColumns({ onEdit, t }) + hallFields
  locations-table.tsx   data via useGetLocations + useGetHalls, wired to mutations

articles/
  columns.tsx           column definitions for articles
  articles-table.tsx    article list with status badges

performers/
  columns.tsx           static column definitions (API not yet available)
  performers-table.tsx  empty state placeholder

collections/
  columns.tsx           collection list columns
  collections-table.tsx collection management table
```

## Adding a new editable entity

1. Define the type in `@/types/models/` and create hooks in `@/hooks/api/`.
2. Export `make*Columns({ onEdit, t })` + `*Fields: FieldDef[]` from a `columns.tsx`, using the canonical model type.
3. Create a `*-table.tsx` that fetches data via hooks, holds `useState` for editing, passes `onEdit` into the column factory, and renders `<EditSheet>` with `onSave` wired to the update mutation.
4. Add a `page.tsx` under `(content)/[entity]/` that renders the table component.
5. Add the route to `CmsSidebar` navItems or utilityItems.

## EditSheet

`EditSheet<TData>` takes `fields: FieldDef<TData>[]` and renders inputs based on `type`:

- `"text"` → Input
- `"boolean"` → Select with Yes/No
- `"select"` → Select with custom options
- `readOnly: true` → plain display (for IDs, slugs)

Adding a new field type means adding a case to `FieldRow` in `edit-sheet.tsx`.

## Locale-aware columns

Tables backed by entities with per-locale fields (e.g. `Production.translations`, `CollectionRow.{titleNl,titleEn}`) render a single `Title`/`Description` column resolved against the active `useLocale()`. When the primary-locale value is empty, the column falls back to the other locale and renders it in muted italic via `LocalizedText` (`@/components/ui/localized-text`). Factories receive `locale: string` in their options.

The Productions table also renders a leading 40×40 cover preview column using `coverImageUrl` with a `bg-muted` placeholder when null.
