import { http, HttpResponse } from "msw";

import { apiUrl } from "../../utils/env";

const event = {
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

export const eventHandlers = [
    http.get(apiUrl("/events"), () => HttpResponse.json([event])),
    http.get(apiUrl(`/events/${event.id}`), () => HttpResponse.json(event)),
    http.get(apiUrl(`/productions/${event.production_id}/events`), () =>
        HttpResponse.json([event])
    ),
    http.post(apiUrl("/events"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            { ...event, ...(body as Record<string, unknown>) },
            { status: 201 }
        );
    }),
    http.put(apiUrl("/events"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ ...event, ...(body as Record<string, unknown>) });
    }),
    http.delete(apiUrl(`/events/${event.id}`), () => new HttpResponse(null, { status: 204 })),
];
