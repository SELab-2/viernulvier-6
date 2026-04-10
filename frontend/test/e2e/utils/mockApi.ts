import { Page } from "@playwright/test";
import { components } from "@/types/api/generated";

type ProductionPayload = components["schemas"]["ProductionPayload"];
type PaginatedProductionResponse = components["schemas"]["PaginatedResponse_ProductionPayload"];
type PaginatedEventResponse = components["schemas"]["PaginatedResponse_EventPayload"];
type PaginatedLocationResponse = components["schemas"]["PaginatedResponse_LocationPayload"];
type FacetResponse = components["schemas"]["FacetResponse"];
type ArticleListPayload = components["schemas"]["ArticleListPayload"];
type ArticlePayload = components["schemas"]["ArticlePayload"];

/**
 * Mocks the backend API responses for E2E tests.
 *
 * TODO: Eventually, we may want to test against the real Rust API backend
 * by spinning up the database and backend in a dedicated full-stack CI workflow.
 * For now, this isolates the frontend tests and makes them fast and reliable.
 */
export async function mockApi(page: Page) {
    const productionId = (i: number) => "00000000-0000-4000-8000-" + String(i).padStart(12, "0");

    // Mock productions (return enough items to trigger pagination > 20 items)
    const productions: ProductionPayload[] = Array.from({ length: 25 }).map((_, i) => ({
        id: productionId(i + 1),
        slug: `test-theater-${i + 1}`,
        translations: [
            {
                language_code: "nl",
                title: `Test Theater ${i + 1}`,
                description: `Beschrijving ${i + 1}`,
            },
            {
                language_code: "en",
                title: `Test Theater ${i + 1}`,
                description: `Description ${i + 1}`,
            },
        ],
    }));

    const paginatedProductions: PaginatedProductionResponse = {
        data: productions,
        next_cursor: null,
    };

    // GET /api/productions | /api/productions/:id | /api/productions/:id/events
    await page.route("**/api/productions**", async (route) => {
        if (route.request().method() !== "GET") {
            await route.continue();
            return;
        }
        const pathname = new URL(route.request().url()).pathname;
        const segments = pathname.split("/").filter(Boolean);
        const prodIdx = segments.indexOf("productions");
        if (prodIdx < 0) {
            await route.continue();
            return;
        }
        const id = segments[prodIdx + 1];
        const sub = segments[prodIdx + 2];
        if (sub === "events") {
            const emptyEvents: components["schemas"]["EventPayload"][] = [];
            await route.fulfill({ json: emptyEvents });
            return;
        }
        if (id && /^[0-9a-f-]{36}$/i.test(id)) {
            const one: ProductionPayload = productions.find((p) => p.id === id) ?? productions[0];
            await route.fulfill({ json: one });
            return;
        }
        await route.fulfill({ json: paginatedProductions });
    });

    // Mock events
    const emptyPaginatedEvents: PaginatedEventResponse = {
        data: [],
        next_cursor: null,
    };
    await page.route("**/api/events**", async (route) => {
        await route.fulfill({ json: emptyPaginatedEvents });
    });

    // Mock locations
    const emptyPaginatedLocations: PaginatedLocationResponse = {
        data: [],
        next_cursor: null,
    };
    await page.route("**/api/locations**", async (route) => {
        await route.fulfill({ json: emptyPaginatedLocations });
    });

    // Mock facets
    const emptyFacets: FacetResponse[] = [];
    await page.route("**/api/taxonomy/facets**", async (route) => {
        await route.fulfill({ json: emptyFacets });
    });

    // Mock articles
    const articles: ArticleListPayload[] = [
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

    const articleDetail: ArticlePayload = {
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

    // GET /api/articles (public list) and GET /api/articles/:slug (public detail)
    await page.route("**/api/articles**", async (route) => {
        if (route.request().method() !== "GET") {
            await route.continue();
            return;
        }
        const pathname = new URL(route.request().url()).pathname;
        // Skip CMS routes
        if (pathname.includes("/cms")) {
            await route.continue();
            return;
        }
        const segments = pathname.split("/").filter(Boolean);
        const artIdx = segments.indexOf("articles");
        const slug = segments[artIdx + 1];

        if (slug) {
            const match = articles.find((a) => a.slug === slug);
            if (match) {
                await route.fulfill({ json: articleDetail });
            } else {
                await route.fulfill({ status: 404, json: { message: "Not found" } });
            }
            return;
        }
        await route.fulfill({ json: articles });
    });
}
