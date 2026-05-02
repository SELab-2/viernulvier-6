# Series investigation — viernulvier.gent API findings

## Summary

There is no series or theme entity in the viernulvier.gent API. Series grouping is entirely an editorial CMS concept — individual Peppered CMS pages that link productions manually. Grouping information for our purposes lives in two free-text fields on productions: `artist` and `supertitle`.

---

## URL structure

Series and theme pages share the same slug pattern:

```
/nl/<slug>-<id>           → series/info page (full history, past + upcoming)
/nl/theme/<slug>-<id>     → theme page (upcoming only, editorial)
```

The `<id>` suffix (e.g. `zh74`, `18g5`, `nhcf`) is a base36-encoded internal Peppered CMS page ID. It is opaque — there is no API endpoint that accepts it as a filter parameter.

Examples investigated:
- `/nl/concertreeks-palmarium-zh74` — PALMARIUM concert series
- `/nl/videodroom-2026-18g5` — VIDEODROOM 2026 series page
- `/nl/theme/videodroom-2026-nhcf` — VIDEODROOM 2026 theme page (same content, different presentation)

---

## API structure

The productions endpoint (`/api/v1/productions`) returns a `artist` and `supertitle` field per production. Neither can be filtered on via any documented API query parameter. There is no `/api/v1/series`, `/api/v1/themes`, or equivalent.

Productions in a series are linked only by shared values in these free-text fields.

---

## Two conventions — old and new

There are two distinct grouping conventions in the data:

### New convention — `artist` field (from ~2025 onward)

The `artist` field is repurposed to carry the series name. The series name appears as a standalone value, not alongside actual artist credits:

| Series | `artist.nl` value | Productions |
|---|---|---|
| VIDEODROOM 2025 | `"VIDEODROOM 2025"` | 16 |
| VIDEODROOM 2026 | `"VIDEODROOM 2026"` | 1 (at time of fetch) |
| PALMARIUM 2026 | `"PALMARIUM 2026"` | 7 |

These productions have no other artist info — the series name *is* the artist field.

### Old convention — `supertitle` field (pre-2025)

Earlier series used the `supertitle` field to carry the series or programme name:

| Series | `supertitle` value | Notes |
|---|---|---|
| Videodroom (older) | `"Videodroom"` | Lower-case, no year suffix |
| Smells Like Circus | `"SMELLS LIKE CIRCUS"` | |

The `supertitle` field was also used for non-series purposes (e.g. production subtitle, translation, programme context), so matches need to be evaluated carefully.

---

## Implications for seeding

Genre-based series mappings (Podium, Monument) cover only 2 series. All other series are invisible to the genre system. To seed them:

1. Read `artist` and `supertitle` from `seed/raw/productions.json`
2. Match against known series patterns (exact string match on normalised value)
3. Upsert the series record and link via `series_productions`

A new patch file type `production_artist_series_mappings.json` would cover this — mapping an `artist` string value or `supertitle` string value to a series slug.

For confirmed series found in the raw data:

| Match field | Value | Series slug (proposed) |
|---|---|---|
| `artist` | `VIDEODROOM 2025` | `videodroom-2025` |
| `artist` | `VIDEODROOM 2026` | `videodroom-2026` |
| `artist` | `PALMARIUM 2026` | `palmarium-2026` |
| `supertitle` | `Videodroom` | `videodroom` |
| `supertitle` | `SMELLS LIKE CIRCUS` | `smells-like-circus` |

More series almost certainly exist — a full pass over `supertitle` and `artist` values in the raw data is needed to find them all.

---

## Open questions

- Should VIDEODROOM 2025 and VIDEODROOM 2026 be separate series, or sub-editions of a parent VIDEODROOM series?
- Old "Videodroom" (supertitle) vs "VIDEODROOM 2025" (artist) — same series or not?
- Does the seed pipeline need to produce series slug + detail pages, or is just the DB link sufficient?
