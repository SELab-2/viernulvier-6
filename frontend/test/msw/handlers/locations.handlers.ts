import { http, HttpResponse } from "msw";

import { LocationResponse } from "@/types/api/location.api.types";

import { apiUrl } from "../../utils/env";

const location = {
    id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
    source_id: 101,
    name: "Main Venue",
    code: "MV",
    street: "Mainstraat",
    number: "12",
    postal_code: "9000",
    city: "Gent",
    country: "Belgium",
    phone_1: "+32-9-000-00-00",
    phone_2: null,
    is_owned_by_viernulvier: true,
    uitdatabank_id: "udb-main",
    translations: [{ language_code: "nl", description: "Hoofdlocatie", history: null }],
} satisfies LocationResponse;

export const locationHandlers = [
    http.get(apiUrl("/locations"), () => {
        return HttpResponse.json({ data: [location], next_cursor: null });
    }),
    http.get(apiUrl(`/locations/${location.id}`), () => {
        return HttpResponse.json(location);
    }),
    http.post(apiUrl("/locations"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...location,
                ...(body as Record<string, unknown>),
                id: "f7c95f6a-8bb8-43d6-a4bc-f7e18b86f4aa",
            },
            { status: 201 }
        );
    }),
    http.put(apiUrl("/locations"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...location,
            ...(body as Record<string, unknown>),
        });
    }),
    http.delete(apiUrl(`/locations/${location.id}`), () => {
        return new HttpResponse(null, { status: 204 });
    }),
];
