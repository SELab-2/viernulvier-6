import { http, HttpResponse } from "msw";

import { apiUrl } from "../../utils/env";

const facets = [
    {
        slug: "discipline",
        label: "Discipline",
        tags: [
            { slug: "theater", label: "Theater", sort_order: 1 },
            { slug: "music", label: "Music", sort_order: 2 },
        ],
    },
    {
        slug: "format",
        label: "Format",
        tags: [
            { slug: "concert", label: "Concert", sort_order: 1 },
            { slug: "exhibition", label: "Exhibition", sort_order: 2 },
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
