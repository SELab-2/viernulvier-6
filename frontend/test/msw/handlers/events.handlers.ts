import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const event1: components["schemas"]["EventPayload"] = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    source_id: 42,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    starts_at: "2025-06-15T20:00:00Z",
    ends_at: "2025-06-15T22:00:00Z",
    intermission_at: null,
    doors_at: "2025-06-15T19:00:00Z",
    vendor_id: null,
    box_office_id: null,
    uitdatabank_id: null,
    max_tickets_per_order: 10,
    production_id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
    status: "available",
    hall_id: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
};

const event2: components["schemas"]["EventPayload"] = {
    id: "b2c3d4e5-f6g7-8901-bcde-f12345678901",
    source_id: 43,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    starts_at: "2025-06-16T20:00:00Z",
    ends_at: "2025-06-16T22:00:00Z",
    intermission_at: null,
    doors_at: "2025-06-16T19:00:00Z",
    vendor_id: null,
    box_office_id: null,
    uitdatabank_id: null,
    max_tickets_per_order: 10,
    production_id: "5g438g06-4b75-5gd1-9g7b-b0ed55d12222",
    status: "available",
    hall_id: "e41g6g06-4b75-5gd1-9g7b-b0ed55d13333",
};

export const eventHandlers = [
    http.get(apiUrl("/events"), ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");

        // Simulate pagination: if cursor is provided, return second page
        if (cursor === "page2") {
            return HttpResponse.json({
                data: [event2],
                next_cursor: null,
            } satisfies components["schemas"]["PaginatedResponse_EventPayload"]);
        }

        // First page - return first event with cursor to next page
        return HttpResponse.json({
            data: [event1],
            next_cursor: "page2",
        } satisfies components["schemas"]["PaginatedResponse_EventPayload"]);
    }),
    http.get(apiUrl(`/events/${event1.id}`), () =>
        HttpResponse.json(event1 satisfies components["schemas"]["EventPayload"])
    ),
    http.get(apiUrl(`/events/${event2.id}`), () =>
        HttpResponse.json(event2 satisfies components["schemas"]["EventPayload"])
    ),
    http.get(apiUrl(`/productions/${event1.production_id}/events`), () =>
        HttpResponse.json([event1] satisfies components["schemas"]["EventPayload"][])
    ),
    http.post(apiUrl("/events"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...event1,
                ...(body as Record<string, unknown>),
            } satisfies components["schemas"]["EventPayload"],
            { status: 201 }
        );
    }),
    http.put(apiUrl("/events"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...event1,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["EventPayload"]);
    }),
    http.delete(apiUrl(`/events/${event1.id}`), () => new HttpResponse(null, { status: 204 })),
];
