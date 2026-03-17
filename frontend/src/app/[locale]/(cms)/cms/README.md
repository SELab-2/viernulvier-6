# CMS

Entry point is `layout.tsx`, which renders the tab bar and wraps all CMS routes.

## Route structure

```
cms/
  layout.tsx              tab bar (CmsTabBar), wraps everything
  page.tsx                /cms → overview

  (content)/
    layout.tsx            sidebar (AppSidebar), wraps entity routes
    productions/page.tsx  /cms/productions
    venues/page.tsx       /cms/venues
    articles/page.tsx     /cms/articles
    performers/page.tsx   /cms/performers

  ingest/page.tsx         /cms/ingest
  import/page.tsx         /cms/import
```

The tab bar (`cms-tab-bar.tsx`) reads `usePathname` to set the active tab and navigates on change. The sidebar (`AppSidebar`) does the same for entity type links — both use `@/i18n/routing` for locale-aware navigation.

## tables/

```
data-table.tsx          reusable TanStack Table wrapper, handles expand/collapse
actions-column.tsx      factory: makeActionsColumn({ label, copyKey, onEdit? })
edit-sheet.tsx          generic EditSheet<TData> + FieldDef<TData> type

productions/
  columns.tsx           makeProductionColumns({ onEdit? }) + productionFields
  event-columns.tsx     makeEventColumns({ onEdit? }) + eventFields
  productions-table.tsx data + sheet state for productions and their events

venues/
  columns.tsx           makeVenueColumns({ onEdit? }) + venueFields
  hall-columns.tsx      makeHallColumns({ onEdit? }) + hallFields
  venues-table.tsx      data + sheet state for venues and their halls

articles/
  columns.tsx           static column definitions
  articles-table.tsx    data, no edit yet

performers/
  columns.tsx           static column definitions
  performers-table.tsx  data, no edit yet
```

## Adding a new editable entity

1. Define the type and export `make*Columns({ onEdit? })` + `*Fields: FieldDef[]` from a `columns.tsx`.
2. Create a `*-table.tsx` that holds `useState` for the entity being edited, passes `onEdit` into the column factory, and renders `<EditSheet>`.
3. Add a `page.tsx` under `(content)/[entity]/` that renders the table component.
4. Add the route to `AppSidebar` and `CmsTabBar` if needed.

## EditSheet

`EditSheet<TData>` takes `fields: FieldDef<TData>[]` and renders inputs based on `type`:

- `"text"` → Input
- `"boolean"` → Select with Yes/No
- `"select"` → Select with custom options
- `readOnly: true` → plain display (for IDs, slugs)

Adding a new field type means adding a case to `FieldRow` in `edit-sheet.tsx`.
