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
    published_at: "2026-01-20T12:00:00Z",
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
        published_at: "2026-01-20T12:00:00Z",
        subject_period_start: "1960-01-01",
        subject_period_end: "1970-12-31",
    },
    {
        id: "bbbbbbbb-cccc-4ddd-eeee-ffffffffffff",
        slug: "de-balzaal-door-de-jaren-heen",
        status: "published",
        title: "De Balzaal door de jaren heen",
        updated_at: "2026-02-10T09:00:00Z",
        published_at: "2026-02-15T10:00:00Z",
        subject_period_start: "1960-01-01",
        subject_period_end: "1980-12-31",
    },
];

export const articleHandlers = [
    // Public: articles by production (must come before generic /articles)
    http.get(apiUrl("/articles"), ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("related_entity_type") === "production") {
            return HttpResponse.json({
                data: articleListItems,
                next_cursor: null,
            });
        }
        // Fallthrough to next handler
        return;
    }),

    // Public: list published articles
    http.get(apiUrl("/articles"), ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.includes("/cms")) return;
        return HttpResponse.json({
            data: articleListItems,
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_ArticleListPayload"]);
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

    // CMS: search articles (must come before CMS list)
    http.get(apiUrl("/articles/cms/search"), () => {
        return HttpResponse.json({
            data: articleListItems,
            next_cursor: null,
        } satisfies components["schemas"]["PaginatedResponse_ArticleListPayload"]);
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

    // CMS: create article
    http.post(apiUrl("/articles"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
            {
                ...articleFull,
                ...(body as Record<string, unknown>),
                id: "cccccccc-bbbb-4ccc-dddd-eeeeeeeeeeee",
            } satisfies components["schemas"]["ArticlePayload"],
            { status: 201 }
        );
    }),

    // CMS: update article
    http.put(apiUrl("/articles/cms/:id"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...articleFull,
            ...(body as Record<string, unknown>),
        } satisfies components["schemas"]["ArticlePayload"]);
    }),

    // CMS: delete article
    http.delete(apiUrl("/articles/cms/:id"), () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // CMS: article relations (GET)
    http.get(apiUrl("/articles/cms/:id/relations"), () => {
        return HttpResponse.json({
            production_ids: ["4f327f95-3a64-4fc0-8f6a-a9dc44c01111"],
            artist_ids: [],
            location_ids: [],
            event_ids: [],
        } satisfies components["schemas"]["ArticleRelationsPayload"]);
    }),

    // CMS: article relations (PUT)
    http.put(apiUrl("/articles/cms/:id/relations"), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(body as Record<string, unknown>);
    }),
];
