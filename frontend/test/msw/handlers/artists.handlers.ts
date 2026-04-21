import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const artist: components["schemas"]["ArtistPayload"] = {
    id: "1c4d1d7b-3a5e-4b68-b763-9cf92f43d001",
    slug: "test-artist",
    name: "Test Artist",
};

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
            artist: "Test Artist",
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

export const artistHandlers = [
    http.get(apiUrl("/artists"), () =>
        HttpResponse.json([artist] satisfies components["schemas"]["ArtistPayload"][])
    ),
    http.get(apiUrl(`/artists/${artist.id}`), () =>
        HttpResponse.json(artist satisfies components["schemas"]["ArtistPayload"])
    ),
    http.get(apiUrl(`/artists/${artist.id}/productions`), () =>
        HttpResponse.json([production] satisfies components["schemas"]["ProductionPayload"][])
    ),
];
