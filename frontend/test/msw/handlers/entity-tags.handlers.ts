import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const theaterFacet: components["schemas"]["EntityFacetResponse"] = {
    slug: "discipline",
    translations: [],
    tags: [
        {
            slug: "theater",
            inherited: false,
            sort_order: 0,
            translations: [
                { label: "Theater", language_code: "nl", description: null },
                { label: "Theatre", language_code: "en", description: null },
            ],
        },
        {
            slug: "dans",
            inherited: true,
            sort_order: 1,
            translations: [{ label: "Dans", language_code: "nl", description: null }],
        },
    ],
};

export const entityTagHandlers = [
    http.get(apiUrl("/tags/production/test-prod-id"), () => HttpResponse.json([theaterFacet])),
    http.put(apiUrl("/tags/production/test-prod-id"), async ({ request }) => {
        const body = await request.json();
        const slugs: string[] = (body as { tag_slugs: string[] }).tag_slugs;
        return HttpResponse.json([
            {
                ...theaterFacet,
                tags: slugs.map((slug, i): components["schemas"]["EntityTagResponse"] => ({
                    slug,
                    inherited: false,
                    sort_order: i,
                    translations: [],
                })),
            },
        ]);
    }),
];
