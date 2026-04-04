import { http, HttpResponse } from "msw";

import { apiUrl } from "../../utils/env";

const production = {
    id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
    source_id: 10,
    slug: "test-production",
    supertitle_nl: null,
    supertitle_en: null,
    title_nl: "Productie NL",
    title_en: "Production EN",
    artist_nl: null,
    artist_en: null,
    meta_title_nl: null,
    meta_title_en: null,
    meta_description_nl: null,
    meta_description_en: null,
    tagline_nl: null,
    tagline_en: null,
    teaser_nl: null,
    teaser_en: null,
    description_nl: null,
    description_en: null,
    description_extra_nl: null,
    description_extra_en: null,
    description_2_nl: null,
    description_2_en: null,
    video_1: null,
    video_2: null,
    quote_nl: null,
    quote_en: null,
    quote_source_nl: null,
    quote_source_en: null,
    programme_nl: null,
    programme_en: null,
    info_nl: null,
    info_en: null,
    description_short_nl: null,
    description_short_en: null,
    eticket_info: null,
    uitdatabank_theme: null,
    uitdatabank_type: null,
};

export const productionHandlers = [
    http.get(apiUrl("/productions"), () =>
        HttpResponse.json({ data: [production], next_cursor: null })
    ),
    http.get(apiUrl(`/productions/${production.id}`), () => HttpResponse.json(production)),
    http.post(apiUrl("/productions"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            { ...production, ...(body as Record<string, unknown>) },
            { status: 201 }
        );
    }),
    http.put(apiUrl("/productions"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ ...production, ...(body as Record<string, unknown>) });
    }),
    http.delete(
        apiUrl(`/productions/${production.id}`),
        () => new HttpResponse(null, { status: 204 })
    ),
];
