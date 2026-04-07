import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const space: components["schemas"]["SpacePayload"] = {
    id: "cb74aa4f-6856-4a8b-9930-2a8c56ec3333",
    source_id: 33,
    name_nl: "Main Space",
    location_id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
};

export const spaceHandlers = [
    http.get(apiUrl("/spaces"), () =>
        HttpResponse.json({
            data: [space],
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_SpacePayload"])
    ),
    http.get(apiUrl(`/spaces/${space.id}`), () =>
        HttpResponse.json(space satisfies components["schemas"]["SpacePayload"])
    ),
    http.post(apiUrl("/spaces"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...space,
                ...(body as Record<string, unknown>),
            } satisfies components["schemas"]["SpacePayload"],
            { status: 201 }
        );
    }),
    http.put(apiUrl("/spaces"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...space,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["SpacePayload"]);
    }),
    http.delete(apiUrl(`/spaces/${space.id}`), () => new HttpResponse(null, { status: 204 })),
];
