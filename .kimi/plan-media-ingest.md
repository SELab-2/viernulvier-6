# Plan: Media Ingest Page

## Context
De huidige `/cms/ingest` pagina is een placeholder ("Coming soon"). We gaan deze vervangen door een volwaardige media-ingest pagina met masonry grid, upload, preview en metadata-management — consistent met de bestaande CMS styling.

## Designbeslissingen
- **Masonry layout**: Hergebruik het flexbox-columns patroon van `CollectionGrid` (custom JS column-splitting + `flex gap-4`), aangepast voor media thumbnails.
- **Upload**: Hergebruik het hidden-file-input + `useUploadMedia` patroon uit `MediaPickerDialog` / `ProductionMediaSheet`.
- **Preview**: Hergebruik `ImageSpotlight` voor full-size preview.
- **Edit**: Hergebruik `Sheet` met metadata form (alt text + credit in NL/EN/FR) zoals in `ProductionMediaSheet`.
- **Styling**: Tailwind-only, consistent met CMS — mono labels, sharp borders, `bg-foreground/[0.02]` voor lege states.

## Bestanden

### Nieuw
1. `frontend/src/components/ingest/media-masonry-grid.tsx` — Masonry grid component met responsive column count (1/2/3 cols).
2. `frontend/src/components/ingest/media-ingest-card.tsx` — Media card met thumbnail, hover overlay (view/edit/delete), en metadata summary.
3. `frontend/src/components/ingest/media-upload-dialog.tsx` — Dialog voor upload: file select, preview, metadata inputs, upload button.
4. `frontend/src/components/ingest/media-edit-sheet.tsx` — Sheet voor metadata editing (alt text + credit NL/EN/FR).

### Gewijzigd
5. `frontend/src/app/[locale]/(cms)/cms/(main)/ingest/page.tsx` — Vervang placeholder door volledige pagina met grid, upload knop, ImageSpotlight integratie.
6. `frontend/src/messages/en.json` + `nl.json` — Nieuwe vertalingen voor upload/edit states.

## Data flow
- **Fetch**: `useGetInfiniteMedia()` voor infinite-scroll masonry grid.
- **Upload**: `useUploadMedia()` → invalidatie van `media.infinite` query.
- **Edit**: `useUpdateMedia()` → optimistic update of cache invalidatie.
- **Delete**: `useDeleteMedia()` → cache invalidatie + toast feedback.
- **Preview**: `ImageSpotlight` met `kind: "media"` items.

## Architectuur
```
IngestPage
├── PageHeader (title + upload button)
├── ActionBar (bulk delete — optioneel v1)
├── MediaMasonryGrid
│   └── MediaIngestCard[] (per column)
│       ├── Thumbnail (Next.js Image)
│       └── HoverOverlay (view / edit / delete)
├── MediaUploadDialog (open state)
├── MediaEditSheet (open state)
└── ImageSpotlight (open state)
```

## Vragen
1. Wil je **bulk selectie + bulk delete** in v1, of is single-item management voldoende?
2. Wil je **drag & drop upload** of is een klassieke file-picker voldoende?
3. Moeten we **filters/search** binnen de ingest page ondersteunen (zoals in MediaPickerDialog)?
