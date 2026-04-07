import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const facets: components["schemas"]["FacetResponse"][] = [
    {
        slug: "discipline",
        translations: [
            { language_code: "nl", label: "Discipline" },
            { language_code: "en", label: "Discipline" },
        ],
        tags: [
            {
                slug: "theatre",
                sort_order: 1,
                translations: [
                    { language_code: "nl", label: "Theater", description: null },
                    { language_code: "en", label: "Theatre", description: null },
                ],
            },
            {
                slug: "music",
                sort_order: 2,
                translations: [
                    { language_code: "nl", label: "Muziek", description: null },
                    { language_code: "en", label: "Music", description: null },
                ],
            },
        ],
    },
    {
        slug: "format",
        translations: [
            { language_code: "nl", label: "Formaat" },
            { language_code: "en", label: "Format" },
        ],
        tags: [
            {
                slug: "world-premiere",
                sort_order: 1,
                translations: [
                    { language_code: "nl", label: "Wereldpremière", description: null },
                    { language_code: "en", label: "World premiere", description: null },
                ],
            },
            {
                slug: "festival",
                sort_order: 2,
                translations: [
                    { language_code: "nl", label: "Festival", description: null },
                    { language_code: "en", label: "Festival", description: null },
                ],
            },
        ],
    },
];

export const taxonomyHandlers = [
    http.get(apiUrl("/taxonomy/facets"), ({ request }) => {
        const url = new URL(request.url);
        const entityType = url.searchParams.get("entity_type");

        if (entityType === "production") {
            return HttpResponse.json(facets satisfies components["schemas"]["FacetResponse"][]);
        }

        return HttpResponse.json(facets satisfies components["schemas"]["FacetResponse"][]);
    }),
];
