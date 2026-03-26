# Search & Filter API Spec

**Status:** Draft
**Scope:** Backend implementation spec for entity querying — filterable list endpoints and unified search.

---

## 1. Overview

The archive exposes two query surfaces:

1. **Per-type filtered list endpoints**: used by the CMS and public browsing pages for a single entity type.
2. **Unified search endpoint**: used by the public search page, returns interleaved results across entity types.

**Excluded from this spec:** Media entities (deferred to a later iteration).

---

## 2. Entity Types in Scope

| Type         | Table        |
|--------------|--------------|
| `production` | `productions` |
| `artist`     | `artists`    |
| `article`    | `blogposts`  |

---

## 3. Schema Changes Required

### 3.1 `pg_trgm` extension

Enable the PostgreSQL trigram extension for fuzzy search:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Add GIN trigram indexes on all searched text fields (see §6.2).

### 3.2 Article subject date

Add subject date range to `blogposts`:

```sql
ALTER TABLE blogposts
  ADD COLUMN subject_date_from DATE,
  ADD COLUMN subject_date_to   DATE;
```

Both columns are nullable independently. An article without either column set has no subject date and is excluded from date-range filtered queries.

### 3.3 Published/draft state (future)

> **Note for implementors:** Productions, artists, and articles will eventually have a published/draft distinction. The auth-aware layer is out of scope for the initial implementation but the design must accommodate it:
>
> - Unauthenticated requests return only published entities.
> - Authenticated editor/admin requests return all entities including drafts.
>
> Concrete schema changes (e.g. `status` column or `published_at` nullable) are deferred. The query layer should be structured so a `published = true` filter clause can be added without restructuring.

---

## 4. Common Query Parameters

All filter params are optional. Params are AND-combined across dimensions.

### 4.1 Facet filters

One query param per facet. Value is a comma-separated list of tag slugs within that facet (OR semantics within a facet).

| Param         | Applies to                        |
|---------------|-----------------------------------|
| `?discipline=` | production, artist, article      |
| `?format=`    | production, article               |
| `?theme=`     | production, article               |
| `?audience=`  | production, article               |

**Semantics:**
- Within a facet: **OR** — entity must have at least one of the specified tags.
- Across facets: **AND** — entity must satisfy all specified facets.

**Validation:**
- Unknown facet param name → `400 Bad Request`.
- Unknown tag slug within a known facet → `400 Bad Request`.
- Facet param used on an endpoint where that facet does not apply → `400 Bad Request`.

Example: `?discipline=theatre,dance&theme=memory` → entities tagged (Theatre OR Dance) AND (Memory).

### 4.2 Fuzzy search

```
?q=<string>
```

- Performs trigram similarity search using `pg_trgm`.
- Similarity threshold: **0.3** (tunable constant in implementation, not a query param).
- Searches both `_nl` and `_en` locale variants of all text fields (union of matches).
- Fields searched per entity type:

| Type         | Fields                                                        |
|--------------|---------------------------------------------------------------|
| `production` | `title_nl`, `title_en`, `supertitle_nl`, `supertitle_en`, `artist_nl`, `artist_en` |
| `artist`     | `name`                                                        |
| `article`    | `title_nl`, `title_en`, `author`                             |

- When `?q=` is present, results can be sorted by similarity score (see §4.5).
- `?q=` is combinable with all other filter params (AND).

### 4.3 Artist filter

```
?artist=<slug>[,<slug>...]
```

- Matches productions/articles linked to the specified artist(s) via the `production_artists` join table and article relation tables.
- Multiple slugs: **OR** semantics.
- Unknown artist slug → `400 Bad Request`.
- No role dimension in this filter (deferred).

### 4.4 Location filter

```
?location=<slug>[,<slug>...]
```

- Matches productions that have at least one event whose hall belongs to the specified location(s).
- Join path: `productions → events → halls → spaces → locations`.
- Multiple slugs: **OR** semantics.
- A production matches if **any** of its events occurred at the location (not necessarily all).
- Unknown location slug → `400 Bad Request`.
- For articles: matches articles linked to the specified location(s) via `articles_about_locations`.

### 4.5 Date range filter

```
?date_from=<ISO 8601 date>
?date_to=<ISO 8601 date>
```

- Both params are optional; either can be used independently (half-open range).
- Dates are inclusive.
- Invalid date format → `400 Bad Request`.

**Per entity type:**

| Type         | Matched against                                                             |
|--------------|-----------------------------------------------------------------------------|
| `production` | `events.starts_at` — production must have at least one event overlapping `[date_from, date_to]` |
| `article`    | `subject_date_from` / `subject_date_to` — article's subject range must overlap `[date_from, date_to]` |
| `artist`     | Date filter not applicable; returns `400 Bad Request` if used on `/api/artists` |

**Overlap condition for productions:**
```
event.starts_at <= date_to AND event.starts_at >= date_from
```
(or if `ends_at` is set: `event.starts_at <= date_to AND (event.ends_at >= date_from OR event.starts_at >= date_from)`)

**Articles without a subject date** are excluded when a date filter is active.

### 4.6 Sort order

```
?sort=recent|oldest|relevance
```

| Value       | Behaviour                                              |
|-------------|--------------------------------------------------------|
| `recent`    | Descending by UUIDv7 (creation time). **Default.**     |
| `oldest`    | Ascending by UUIDv7 (creation time).                   |
| `relevance` | Descending by `pg_trgm` similarity score. Requires `?q=`. |

- `?sort=relevance` without `?q=` → `400 Bad Request`.
- `?sort=oldest` or `?sort=recent` with `?q=` → allowed; sort by time, not score.
- Default sort when `?q=` is present and no `?sort=` specified: `relevance`.
- Default sort when no `?q=`: `recent`.

### 4.7 Cursor-based pagination

```
?after=<opaque_cursor>
```

- Cursor encodes the sort key of the last seen item as an opaque base64 token.
- For `recent`/`oldest`: cursor encodes the last seen UUIDv7 (which is time-ordered).
- For `relevance`: cursor encodes `(similarity_score, id)` compound key.
- Cursor is opaque to the client — do not parse or construct.
- Invalid/expired cursor → `400 Bad Request`.
- No `total` count in response.

**Default page size:** 20. **Maximum page size:** 100 (not a query param; fixed server-side).

---

## 5. Per-Type Endpoints

### 5.1 `GET /api/productions`

Accepted params: `?q`, `?discipline`, `?format`, `?theme`, `?audience`, `?artist`, `?location`, `?date_from`, `?date_to`, `?sort`, `?after`

### 5.2 `GET /api/artists`

Accepted params: `?q`, `?discipline`, `?sort`, `?after`

Note: `?date_from`/`?date_to`, `?location`, `?artist` are not applicable → `400` if provided.

### 5.3 `GET /api/articles`

Accepted params: `?q`, `?discipline`, `?format`, `?theme`, `?audience`, `?artist`, `?location`, `?date_from`, `?date_to`, `?sort`, `?after`

Note: date range matches `subject_date_from`/`subject_date_to`, not `published_at`.

---

## 6. Unified Search Endpoint

### 6.1 `GET /api/search`

Returns interleaved results across production, artist, and article types.

**Additional param:**
```
?type=production,artist,article
```
- Comma-separated list of entity types to include. Default: all three.
- Unknown type value → `400 Bad Request`.

All filter params from §4 are accepted and applied per entity type where applicable. Params not applicable to a type are silently skipped for that type (e.g. `?date_from=` does not filter artists, but does not return a 400 on this endpoint).

**Sorting:** Results from all types are interleaved and sorted by the same `?sort=` param. When `?sort=relevance`, similarity scores are comparable across types.

### 6.2 Response shape

```json
{
  "data": [
    {
      "type": "production",
      "id": "019xxxxx-...",
      "slug": "woyzeck-2019",
      "title_nl": "Woyzeck",
      "title_en": "Woyzeck",
      "starts_at": "2019-03-01",
      "ends_at": "2019-03-15",
      "score": 0.87
    },
    {
      "type": "artist",
      "id": "019xxxxx-...",
      "slug": "jan-fabre",
      "name": "Jan Fabre",
      "score": 0.72
    },
    {
      "type": "article",
      "id": "019xxxxx-...",
      "slug": "interview-fabre-2019",
      "title_nl": "Interview met Jan Fabre",
      "title_en": "Interview with Jan Fabre",
      "published_at": "2019-04-01T00:00:00Z",
      "score": 0.65
    }
  ],
  "next_cursor": "eyJzY29yZSI6MC42NSwiaWQiOiIwMTl4eHgifQ"
}
```

- `score` is present and non-null only when `?q=` is given.
- `next_cursor` is `null` when there are no more results.
- No `total` count.
- Tags are **not** included in summary results.

### 6.3 Per-type summary fields

| Type         | Fields                                                         |
|--------------|----------------------------------------------------------------|
| `production` | `type`, `id`, `slug`, `title_nl`, `title_en`, `starts_at`, `ends_at`, `score` |
| `artist`     | `type`, `id`, `slug`, `name`, `score`                         |
| `article`    | `type`, `id`, `slug`, `title_nl`, `title_en`, `published_at`, `score` |

---

## 7. Error Response Shape

All `400` errors use a consistent envelope:

```json
{
  "error": "invalid_param",
  "message": "Unknown tag slug 'nonexistent' for facet 'discipline'",
  "param": "discipline"
}
```

---

## 8. Implementation Notes

### 8.1 Fuzzy search indexes

Add GIN trigram indexes for all searched fields:

```sql
CREATE INDEX ON productions USING GIN (title_nl gin_trgm_ops);
CREATE INDEX ON productions USING GIN (title_en gin_trgm_ops);
CREATE INDEX ON productions USING GIN (supertitle_nl gin_trgm_ops);
CREATE INDEX ON productions USING GIN (supertitle_en gin_trgm_ops);
CREATE INDEX ON productions USING GIN (artist_nl gin_trgm_ops);
CREATE INDEX ON productions USING GIN (artist_en gin_trgm_ops);
CREATE INDEX ON artists    USING GIN (name gin_trgm_ops);
CREATE INDEX ON blogposts  USING GIN (title_nl gin_trgm_ops);
CREATE INDEX ON blogposts  USING GIN (title_en gin_trgm_ops);
CREATE INDEX ON blogposts  USING GIN (author gin_trgm_ops);
```

### 8.2 Similarity threshold

The similarity threshold of `0.3` is a named constant in the implementation. Do not hardcode inline — it should be easy to tune without touching query logic.

### 8.3 Facet validation

Valid facet names and their applicable entity types are defined in the `facet_entity_types` table. Validate incoming params against this table at request time (or cache at startup).

### 8.4 Cursor encoding

Encode cursors as base64url JSON. The cursor payload should include:
- `sort`: the sort field value of the last item
- `id`: the UUID of the last item (tiebreaker)

Example payload: `{"sort": 0.65, "id": "019xxx..."}` or `{"sort": "019xxx...", "id": "019xxx..."}` for UUIDv7-based sorts.

### 8.5 Auth-aware results (future)

The query layer must be structured to accept an optional `include_drafts: bool` flag that adds a `WHERE published = true` clause (or equivalent) when false. This flag will be derived from the request's auth context once the published/draft schema is defined.
