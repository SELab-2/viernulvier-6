import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const media: components["schemas"]["MediaPayload"] = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    url: "https://s3.example.com/media/test.jpg",
    s3_key: "media/test.jpg",
    mime_type: "image/jpeg",
    file_size: 120000,
    width: 1920,
    height: 1080,
    checksum: "sha256-abc",
    alt_text_nl: "Testafbeelding",
    alt_text_en: "Test image",
    alt_text_fr: null,
    description_nl: "Een testbeschrijving",
    description_en: null,
    description_fr: null,
    credit_nl: "Fotograaf",
    credit_en: null,
    credit_fr: null,
    geo_latitude: null,
    geo_longitude: null,
    parent_id: null,
    derivative_type: null,
    gallery_type: "gallery",
    source_system: "cms",
    source_uri: null,
    crops: [],
};

export const coverMedia: components["schemas"]["MediaPayload"] = {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    url: "https://s3.example.com/media/cover.jpg",
    s3_key: "media/cover.jpg",
    mime_type: "image/jpeg",
    file_size: 80000,
    width: 1600,
    height: 900,
    checksum: "sha256-cover",
    alt_text_nl: "Omslagfoto",
    alt_text_en: "Cover photo",
    alt_text_fr: null,
    description_nl: null,
    description_en: null,
    description_fr: null,
    credit_nl: "Fotograaf X",
    credit_en: null,
    credit_fr: null,
    geo_latitude: null,
    geo_longitude: null,
    parent_id: null,
    derivative_type: null,
    gallery_type: "cover",
    source_system: "cms",
    source_uri: null,
    crops: [],
};

export const mediaHandlers = [
    // Entity media — returns empty by default; override per test with server.use()
    http.get(apiUrl("/media/entity/:entityType/:entityId"), () =>
        HttpResponse.json([] satisfies components["schemas"]["MediaPayload"][])
    ),

    // Attach media to entity
    http.post(apiUrl("/media/entity/:entityType/:entityId/attach"), () =>
        HttpResponse.json(coverMedia satisfies components["schemas"]["MediaPayload"])
    ),

    // Unlink media from entity
    http.delete(
        apiUrl("/media/entity/:entityType/:entityId/:mediaId"),
        () => new HttpResponse(null, { status: 204 })
    ),

    // Generate upload URL
    http.post(apiUrl("/media/upload-url"), () =>
        HttpResponse.json({
            s3_key: "uploads/new-file.jpg",
            upload_url: "https://s3.example.com/presigned-upload",
            expires_in: 3600,
        })
    ),

    http.get(apiUrl("/media"), ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q");

        // When searching, return the item only if query loosely matches
        if (q && !media.alt_text_nl?.toLowerCase().includes(q.toLowerCase())) {
            return HttpResponse.json({
                data: [],
                next_cursor: null,
            } satisfies components["schemas"]["PaginatedResponse_MediaPayload"]);
        }

        return HttpResponse.json({
            data: [media],
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_MediaPayload"]);
    }),
    http.get(apiUrl(`/media/${media.id}`), () =>
        HttpResponse.json(media satisfies components["schemas"]["MediaPayload"])
    ),
];
