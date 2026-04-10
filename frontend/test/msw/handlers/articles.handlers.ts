import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

export const articleFull: components["schemas"]["ArticlePayload"] = {
    id: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
    slug: "kleurenstudies-van-de-vooruit",
    status: "published",
    title: "Kleurenstudies van De Vooruit",
    content: {
        type: "doc",
        content: [
            {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Het begin" }],
            },
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "In de jaren 60 begon een revolutie in de kunstwereld van Gent.",
                    },
                ],
            },
        ],
    },
    created_at: "2026-01-15T10:30:00Z",
    updated_at: "2026-03-20T14:00:00Z",
    subject_period_start: "1960-01-01",
    subject_period_end: "1970-12-31",
};

export const articleListItems: components["schemas"]["ArticleListPayload"][] = [
    {
        id: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
        slug: "kleurenstudies-van-de-vooruit",
        status: "published",
        title: "Kleurenstudies van De Vooruit",
        updated_at: "2026-03-20T14:00:00Z",
        subject_period_start: "1960-01-01",
        subject_period_end: "1970-12-31",
    },
    {
        id: "bbbbbbbb-cccc-4ddd-eeee-ffffffffffff",
        slug: "de-balzaal-door-de-jaren-heen",
        status: "published",
        title: "De Balzaal door de jaren heen",
        updated_at: "2026-02-10T09:00:00Z",
        subject_period_start: "1960-01-01",
        subject_period_end: "1980-12-31",
    },
];

export const articleHandlers = [
    // Public: list published articles
    http.get(apiUrl("/articles"), ({ request }) => {
        const url = new URL(request.url);
        // Don't match CMS paths
        if (url.pathname.includes("/cms")) return;
        return HttpResponse.json(
            articleListItems satisfies components["schemas"]["ArticleListPayload"][]
        );
    }),

    // Public: single article by slug
    http.get(apiUrl("/articles/:slug"), ({ params }) => {
        const { slug } = params;
        if (slug === "cms") return; // pass through CMS routes
        if (slug === articleFull.slug) {
            return HttpResponse.json(articleFull satisfies components["schemas"]["ArticlePayload"]);
        }
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }),

    // CMS: list all articles
    http.get(apiUrl("/articles/cms"), () => {
        return HttpResponse.json(
            articleListItems satisfies components["schemas"]["ArticleListPayload"][]
        );
    }),

    // CMS: single article by id
    http.get(apiUrl("/articles/cms/:id"), ({ params }) => {
        const { id } = params;
        if (id === articleFull.id) {
            return HttpResponse.json(articleFull satisfies components["schemas"]["ArticlePayload"]);
        }
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }),
];
