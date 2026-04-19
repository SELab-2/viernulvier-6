# Seed normalisation — TODO

## Done

- [x] Location names cleaned up (Bar Bricolage, BLANCO, Galveston-site, Minard, de Koer, Miry, etc.)
- [x] ~50 new locations created for unclassified venues (De Krook, S.M.A.K., CAMPO, KASK/LUCA, UGent, Bozar, Wintercircus, etc.)
- [x] Spaces remapped to correct parent locations
- [x] Duplicate location deleted (De Vooruit source_id 88)
- [x] ~55 hall merges (Minard variants, Bijloke, online variants, Diverse locaties variants, De Vooruit sub-halls)
- [x] ~30 hall name patches (address suffixes stripped, prefixes cleaned)
- [x] 6 combo halls expanded into components (Concertzaal+Balzaal, Balzaal+Café, etc.)
- [x] Test hall deleted (Peppered test zaal)
- [x] 30 genre → tag mappings (discipline, format, accessibility, language, audience)
- [x] 7 location-specific genres → `production_locations` table (in NTGent, in Minard, etc.)
- [x] `production_locations` junction table added (migration 20260419000001)

## Todo

### Artist normalisation (biggest gap)
- [ ] Extract `artist` free-text field from each production (1994/2658 productions have it)
- [ ] Split multi-artist strings using `split_artist_field()` (`normalization/pre_pass.rs`)
- [ ] Deduplicate artist names across productions (exact match + slug match via `exact_slug_match()`)
- [ ] Insert into `artists` table and link via `production_artists`
- [ ] `normalize_production()` in `normalization/mod.rs` is a stub — needs implementation
- [ ] Decide: deterministic seed step (JSON patch file) or LLM-assisted (Groq client is wired up)

### Series from genres
- [ ] Some genres represent recurring programmes/festivals (e.g. "Podium", "Resident", "stadsatelier")
- [ ] `GenreAction::Series` variant exists in `normalization/schema.rs` but is never used
- [ ] Map genre source_ids to existing series slugs, or create new series and link productions

### Location slugs for raw API locations
- [ ] Locations from the raw API (source_id 1, 9, 12, 15, 56, 87, etc.) are imported with `slug = NULL`
- [ ] Without slugs, location detail pages are unreachable by URL
- [ ] Fix: add slug generation to `apply_location_name_patches()` or add a separate slug assignment step

### Unmapped genres (currently skipped)
- [x] Age ratings: 3+/4+/6+/8+ → `children`, 10+/11+/12+/14+ → `family`, 16+/18+ → `adult`
- [x] Expo (159) → `discipline: expo`
- [x] 360° A/V (285) → `discipline: installation`
- [x] Podium (37) → series "Podium" (29 productions)
- [x] Monument (49) → series "Monument" (15 productions)
- [x] Wandeling, stadsatelier, Feest, optocht, ritueel, listening session, op locatie, Cadeaubon geldig — deliberately skipped (see README.md)

### API / frontend exposure
- [ ] `production_locations` data is seeded but no API endpoint or frontend uses it yet
- [ ] Artist data (once seeded) needs API endpoints and production detail page integration
