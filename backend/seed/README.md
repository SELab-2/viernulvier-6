# Seed normalisation — design decisions

This file records the reasoning behind normalisation choices so future contributors understand why things are the way they are. For how the pipeline works, see `CLAUDE.md`. For what is still open, see `TODO.md`.

---

## Genre mapping strategy

Genres in the 404 API are a heterogeneous mix: art-form disciplines, format flags, accessibility markers, age ratings, location signals, and commercial metadata. We do not map them uniformly — each category gets a different treatment.

### Disciplines, formats, accessibility, language → taxonomy tags
Genres that describe what a production is or how it is presented are mapped to tags in `genre_tag_mappings.json`. The tag taxonomy uses facets: `discipline`, `format`, `audience`, `accessibility`, `language`.

### Age ratings → coarse audience tags
The raw API has ten age rating genres (3+ through 18+). Rather than creating one tag per rating (noisy, hard to filter on), we map them to three coarse `audience` tags:
- 3+, 4+, 6+, 8+ → `children`
- 10+, 11+, 12+, 14+ → `family`
- 16+, 18+ → `adult`

### Location-specific genres → `production_locations`
Genres like "in NTGent", "in Minard", "in Club Wintercircus" carry venue information at the production level. These are not taxonomy tags — they are venue associations. We write them to the `production_locations` junction table via `genre_location_mappings.json`, linking each matched production directly to the referenced location. This keeps event-level hall data (`event_halls`) clean and separates it from production-level venue context.

### Programme strands → series
Genres "Podium" and "Monument" represent recurring VIERNULVIER programme strands, not taxonomic properties. These are seeded as `series` records via `genre_series_mappings.json` and linked to productions through `series_productions`.

---

## Deliberately skipped genres

| Genre | Source ID | Productions | Reason skipped |
|---|---|---|---|
| in De Vooruit | 22 | — | Mapped to `production_locations` |
| By VIERNULVIER | 25 | — | Promotional label, not taxonomy |
| in de Koer | 34 | — | Mapped to `production_locations` |
| op locatie | 64 | 113 | "On location" — venue info already captured via event_halls and locations |
| in Club Wintercircus | 102 | — | Mapped to `production_locations` |
| in Opera Gent | 105 | — | Mapped to `production_locations` |
| in NTGent | 111 | — | Mapped to `production_locations` |
| in MIRY concertzaal | 114 | — | Mapped to `production_locations` |
| Cadeaubon geldig | 201 | 235 | Ticketing/commercial info, not archive metadata |
| in Minard | 210 | — | Mapped to `production_locations` |
| Wandeling | 265 | 1 | Single production, no meaningful tag |
| stadsatelier | 266 | 2 | Too few productions, VIERNULVIER-internal label |
| Feest | 268 | 7 | Too vague; "celebration" doesn't map cleanly to any facet |
| optocht | 277 | 0 | Zero productions |
| ritueel | 278 | 0 | Zero productions |
| listening session | 288 | 1 | Single production, maps loosely to concert but too specific |

---

## UIT databank theme mapping

970/2658 productions carry a `uitdatabank_theme` field from the Flemish cultural events database. These are mapped to discipline tags as a gap-filler after genre mappings, using `ON CONFLICT DO NOTHING` so genres always take precedence.

Skipped themes:
- **meerdere kunstvormen** (12) — catch-all "multiple art forms", no single discipline applies
- **literatuur** (11) — no literature tag in the taxonomy
- **samenleving** (13) — thematic content (society), not a discipline
- **Kunst en kunsteducatie** (17) — art education, doesn't map cleanly
- **Erfgoed** (16) — heritage, not a discipline

---

## Hall normalisation decisions

### Merges
Duplicate halls (same physical room, different API records) are merged: all event links are re-pointed to the canonical record, then the duplicate is deleted. Key decisions:
- All Minard variants (7 records) → single Minardschouwburg
- Bijloke variants → De Bijloke
- All "Online" variants (AU! Platform, Zoom, etc.) → single Online hall
- All generic location placeholders (Ander/Varia, Op locatie, Locatie, Rondleidingen, etc.) → Diverse locaties
- De Vooruit internal sub-halls: Balzaal (zittend) → Balzaal, Theaterzaal (scène) + Gang Theaterzaal → Theaterzaal, Toiletten Café → Café

### Expansions
Combo halls (one record representing multiple rooms used together) are expanded: each component room gets a copy of the event links, then the combo record is deleted. This preserves the individual room associations.

### Deletions
"Peppered test zaal" (source_id 1) was a test record with no real events — deleted outright.

### KASK consolidation
KASK Cinema, KASK Cirque, KASK Zwarte Zaal, and LUCA School of Arts were separate location entries. Consolidated under a single "KASK / LUCA School of Arts" location since they share the same campus. Hall names stripped of the "KASK" prefix (Cinema, Cirque) since the location already provides that context.

### Wintercircus
Two hall records existed: source_id 396 (with space 177 → Wintercircus location) and source_id 450 (no space). Kept 396 (has location link), removed 450.
