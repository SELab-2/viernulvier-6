# Seed normalisation pipeline

## Overview

The seed pipeline imports historical data from the 404 API (Peppered platform) into a clean Postgres schema. It runs in two decoupled stages:

1. **Fetch** (`backend/api/src/bin/fetch_404.rs`) - mirrors the full 404 API to `seed/raw/*.json` (Git LFS). No DB, no transforms.
2. **Normalise** (`backend/api/src/seed.rs`) - reads the cached raw JSON, inserts everything into Postgres in dependency order, then applies the normalisation patches from `seed/normalization/`.

The normalise stage is triggered automatically on first boot when `seed/raw/manifest.json` exists. Re-running it only requires re-seeding the DB — no re-fetch needed.

## Import order

Entities are inserted in dependency order, then patches are applied:

```
locations → spaces → halls → productions → prices → price_ranks → events → event_prices
  → location_names      (patch)
  → location_creations  (patch)
  → space_locations     (patch)
  → location_deletions  (patch)
  → hall_merges         (patch)
  → hall_names      (patch)
  → hall_expansions (patch)
  → hall_deletions  (patch)
```

## Normalisation files (`seed/normalization/`)

All files are JSON arrays. Unknown fields (e.g. `note`) are silently ignored by the parser, so you can always add a `"note"` field for human reference. A missing file is skipped with a warning — it is not an error.

Source IDs come from the `@id` hyperlink in the raw JSON (`/api/v1/halls/42` → source_id `42`). Use `backend/seed/raw/halls.json` (or the relevant raw file) to look up source IDs.

---

### `location_names.json` - rename a location

Overwrites the `name` column on a location row.

```json
{ "source_id": 33, "name": "de Bijloke" }
```

---

### `space_locations.json` - reassign a space to a different location

Points a space at a location that differs from what the API returned. Useful when the API linked a space to a catch-all or incorrect location.

```json
{ "source_id": 14, "location_source_id": 1, "note": "Dansstudio → De Vooruit" }
```

---

### `hall_names.json` - rename a hall

Overwrites the `name` column on a hall row. Applied after merges, so the surviving hall gets the clean name.

```json
{ "source_id": 351, "name": "Kraakhuis" }
```

---

### `location_creations.json` - create a new location and assign spaces to it

Use when a known venue has no location record in the raw API data. The entry creates the row and immediately re-points the listed spaces to it, so no separate `space_locations.json` entry is needed.

`name` and `slug` are required. `slug` must be unique across the locations table — use kebab-case. `space_source_ids` defaults to `[]` if omitted. `city`, `street`, `number`, `postal_code`, `country` are optional.

Re-seeding is idempotent: `ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`.

```json
{
  "name": "De Krook",
  "slug": "de-krook",
  "city": "Gent",
  "space_source_ids": [96]
}
```

To find the space source_ids for a venue, search `backend/seed/raw/spaces.json` by name.

---

### `location_deletions.json` - delete a duplicate or empty location

Deletes a location row. Because `spaces.location_id` is `ON DELETE CASCADE`, any spaces (and their halls) under the deleted location are also removed. Only use this when you have confirmed the location has no spaces, or you intend to drop those spaces too.

Before adding a deletion, verify the location has no spaces in `seed/raw/spaces.json` by searching for its source ID in the `location` field of each space.

```json
{ "source_id": 88, "note": "Duplicate De Vooruit — merged into source_id 1" }
```

Applied after `space_locations` patches so any spaces that were re-pointed away from the deleted location are already moved before the DELETE runs.

---

### `hall_merges.json` - merge two duplicate halls into one

The API sometimes has multiple hall records for the same physical room (different names, different spaces). A merge:
1. Re-points all `event_halls` rows from the removed hall to the kept hall (`ON CONFLICT DO NOTHING`).
2. Deletes all remaining `event_halls` rows for the removed hall.
3. Deletes the removed hall record.

```json
{ "keep_source_id": 8, "remove_source_id": 227, "note": "Concertzaal duplicate" }
```

- `keep_source_id` - the hall that survives.
- `remove_source_id` - the hall that gets deleted.

---

### `hall_expansions.json` - expand a combo hall into its components

Some API records represent a combination of multiple physical rooms (e.g. "Concertzaal + Balzaal"). An expansion:
1. For each component, inserts `event_halls` rows copying all events from the combo hall.
2. Deletes all `event_halls` rows for the combo hall.
3. Deletes the combo hall record.

```json
{ "combo_source_id": 291, "component_source_ids": [8, 10], "note": "Concertzaal + Balzaal" }
```

- `combo_source_id` - the combined hall record to dissolve.
- `component_source_ids` - the individual halls that each get an event link.

---

### `hall_deletions.json` - delete a hall with no useful data

Removes a hall and all its `event_halls` links outright. Use when the hall is noise (test records, catch-all entries) with no value for the archive.

```json
{ "source_id": 999 }
```

---

## Workflow: how to add a new patch

1. Find the source ID in the relevant `seed/raw/*.json` file (look at the `@id` field).
2. Add an entry to the appropriate file in `seed/normalization/`.
3. Re-seed the DB to verify (tear down, re-run migrations, let the importer run).
