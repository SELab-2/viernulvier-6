import { Page } from "@playwright/test";
import { components } from "@/types/api/generated";

type ProductionPayload = components["schemas"]["ProductionPayload"];
type PaginatedProductionResponse = components["schemas"]["PaginatedResponse_ProductionPayload"];
type PaginatedEventResponse = components["schemas"]["PaginatedResponse_EventPayload"];
type PaginatedLocationResponse = components["schemas"]["PaginatedResponse_LocationPayload"];
type FacetResponse = components["schemas"]["FacetResponse"];

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
}
