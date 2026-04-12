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

export const mediaHandlers = [
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
