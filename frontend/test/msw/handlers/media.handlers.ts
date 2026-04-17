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
    // GET /media (paginated list + search)
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

    // GET /media/:id
    http.get(apiUrl("/media/:id"), () =>
        HttpResponse.json(media satisfies components["schemas"]["MediaPayload"])
    ),

    // PUT /media/:id
    http.put(apiUrl("/media/:id"), async ({ request }) => {
        const body = (await request.json()) as components["schemas"]["MediaPayload"];
        return HttpResponse.json({
            ...media,
            ...body,
            // preserve s3_key from the existing media (as the backend does)
            s3_key: media.s3_key,
        } satisfies components["schemas"]["MediaPayload"]);
    }),

    // DELETE /media/:id
    http.delete(apiUrl("/media/:id"), () => new HttpResponse(null, { status: 204 })),

    // GET /media/entity/:entityType/:entityId
    http.get(apiUrl("/media/entity/:entityType/:entityId"), () =>
        HttpResponse.json([media] satisfies components["schemas"]["MediaPayload"][])
    ),

    // POST /media/entity/:entityType/:entityId/attach
    http.post(apiUrl("/media/entity/:entityType/:entityId/attach"), async ({ request }) => {
        const body = (await request.json()) as components["schemas"]["AttachMediaRequest"];
        const attached: components["schemas"]["MediaPayload"] = {
            ...media,
            id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
            s3_key: body.s3_key,
            mime_type: body.mime_type,
            alt_text_nl: body.alt_text_nl ?? null,
            alt_text_en: body.alt_text_en ?? null,
            alt_text_fr: body.alt_text_fr ?? null,
            gallery_type: body.role ?? "gallery",
        };
        return HttpResponse.json(attached, { status: 201 });
    }),

    // DELETE /media/entity/:entityType/:entityId/:mediaId (unlink)
    http.delete(
        apiUrl("/media/entity/:entityType/:entityId/:mediaId"),
        () => new HttpResponse(null, { status: 204 })
    ),

    // POST /media/entity/:entityType/:entityId/:mediaId/set-cover
    http.post(
        apiUrl("/media/entity/:entityType/:entityId/:mediaId/set-cover"),
        () => new HttpResponse(null, { status: 204 })
    ),

    // DELETE /media/entity/:entityType/:entityId/cover (clear cover)
    http.delete(
        apiUrl("/media/entity/:entityType/:entityId/cover"),
        () => new HttpResponse(null, { status: 204 })
    ),

    // POST /media/upload-url
    http.post(apiUrl("/media/upload-url"), () =>
        HttpResponse.json({
            s3_key: "media/generated-key.jpg",
            upload_url: "https://s3.example.com/presigned-put-url",
            upload_token: "test-upload-token",
            expires_in: 300,
        } satisfies components["schemas"]["UploadUrlResponse"])
    ),
];
