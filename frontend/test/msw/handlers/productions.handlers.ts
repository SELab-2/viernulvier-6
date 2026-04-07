import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const production: components["schemas"]["ProductionPayload"] = {
    id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
    source_id: 10,
    slug: "test-production",
    video_1: null,
    video_2: null,
    eticket_info: null,
    uitdatabank_theme: null,
    uitdatabank_type: null,
    translations: [
        {
            language_code: "nl",
            title: "Productie NL",
            supertitle: null,
            artist: null,
            meta_title: null,
            meta_description: null,
            tagline: null,
            teaser: null,
            description: null,
            description_extra: null,
            description_2: null,
            quote: null,
            quote_source: null,
            programme: null,
            info: null,
            description_short: null,
        },
        {
            language_code: "en",
            title: "Production EN",
            supertitle: null,
            artist: null,
            meta_title: null,
            meta_description: null,
            tagline: null,
            teaser: null,
            description: null,
            description_extra: null,
            description_2: null,
            quote: null,
            quote_source: null,
            programme: null,
            info: null,
            description_short: null,
        },
    ],
};

export const productionHandlers = [
    http.get(apiUrl("/productions"), () =>
        HttpResponse.json({
            data: [production],
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_ProductionPayload"])
    ),
    http.get(apiUrl(`/productions/${production.id}`), () =>
        HttpResponse.json(production satisfies components["schemas"]["ProductionPayload"])
    ),
    http.post(apiUrl("/productions"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...production,
                ...(body as Record<string, unknown>),
            } satisfies components["schemas"]["ProductionPayload"],
            { status: 201 }
        );
    }),
    http.put(apiUrl("/productions"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...production,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["ProductionPayload"]);
    }),
    http.delete(
        apiUrl(`/productions/${production.id}`),
        () => new HttpResponse(null, { status: 204 })
    ),
];
