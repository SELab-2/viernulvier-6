import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const collectionId = "a0000000-0000-0000-0000-000000000001";

const collection: components["schemas"]["CollectionPayload"] = {
    id: collectionId,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    slug: "test-collectie",
    visibility: "public",
    items: [],
    translations: [
        { title: "Test Collectie", description: null, language_code: "nl" },
        { title: "Test Collection", description: null, language_code: "en" },
    ],
    tags: [],
};

export const collectionHandlers = [
    http.get(apiUrl("/collections"), () =>
        HttpResponse.json({
            data: [collection],
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_CollectionPayload"])
    ),
    http.get(apiUrl(`/collections/${collectionId}`), () =>
        HttpResponse.json(collection satisfies components["schemas"]["CollectionPayload"])
    ),
    http.get(apiUrl(`/collections/slug/${collection.slug}`), () =>
        HttpResponse.json(collection satisfies components["schemas"]["CollectionPayload"])
    ),
    http.post(apiUrl("/collections"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...collection,
                ...(body as Record<string, unknown>),
                id: "b0000000-0000-0000-0000-000000000002",
            } satisfies components["schemas"]["CollectionPayload"],
            { status: 200 }
        );
    }),
    http.put(apiUrl("/collections"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...collection,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["CollectionPayload"]);
    }),
    http.delete(
        apiUrl(`/collections/${collectionId}`),
        () => new HttpResponse(null, { status: 204 })
    ),
    http.post(apiUrl(`/collections/${collectionId}/items`), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                added: (body as { items: unknown[] }).items.length,
                removed: 0,
                total: 5,
            },
            { status: 200 }
        );
    }),
    http.put(apiUrl(`/collections/${collectionId}/items`), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                updated: (body as { items: unknown[] }).items.length,
            },
            { status: 200 }
        );
    }),
];
