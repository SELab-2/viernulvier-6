import { http, HttpResponse } from "msw";

import { apiUrl } from "../../utils/env";

const facets = [
    {
        slug: "discipline",
        translations: {
            nl: { label: "Discipline" },
            en: { label: "Discipline" },
        },
        tags: [
            {
                slug: "theatre",
                sort_order: 1,
                translations: {
                    nl: { label: "Theater", description: null },
                    en: { label: "Theatre", description: null },
                },
            },
            {
                slug: "music",
                sort_order: 2,
                translations: {
                    nl: { label: "Muziek", description: null },
                    en: { label: "Music", description: null },
                },
            },
        ],
    },
    {
        slug: "format",
        translations: {
            nl: { label: "Formaat" },
            en: { label: "Format" },
        },
        tags: [
            {
                slug: "world-premiere",
                sort_order: 1,
                translations: {
                    nl: { label: "Wereldpremière", description: null },
                    en: { label: "World premiere", description: null },
                },
            },
            {
                slug: "festival",
                sort_order: 2,
                translations: {
                    nl: { label: "Festival", description: null },
                    en: { label: "Festival", description: null },
                },
            },
        ],
    },
];

export const taxonomyHandlers = [
    http.get(apiUrl("/taxonomy/facets"), ({ request }) => {
        const url = new URL(request.url);
        const entityType = url.searchParams.get("entity_type");

        if (entityType === "production") {
            return HttpResponse.json(facets);
        }

        return HttpResponse.json(facets);
    }),
];
