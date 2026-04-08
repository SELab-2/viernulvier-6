import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const hall: components["schemas"]["HallPayload"] = {
    id: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
    source_id: 22,
    vendor_id: "vendor-1",
    box_office_id: "box-1",
    seat_selection: true,
    open_seating: false,
    name: "Big Hall",
    remark: null,
    slug: "big-hall",
    space_id: "6135d133-7390-49fe-bfa8-3b7fd7d4f5fd",
};

export const hallHandlers = [
    http.get(apiUrl("/halls"), () =>
        HttpResponse.json({
            data: [hall],
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_HallPayload"])
    ),
    http.get(apiUrl(`/halls/${hall.id}`), () =>
        HttpResponse.json(hall satisfies components["schemas"]["HallPayload"])
    ),
    http.post(apiUrl("/halls"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...hall,
                ...(body as Record<string, unknown>),
            } satisfies components["schemas"]["HallPayload"],
            { status: 201 }
        );
    }),
    http.put(apiUrl("/halls"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...hall,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["HallPayload"]);
    }),
    http.delete(apiUrl(`/halls/${hall.id}`), () => new HttpResponse(null, { status: 204 })),
];
