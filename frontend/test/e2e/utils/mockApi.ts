import { Page } from "@playwright/test";

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
    const productions = Array.from({ length: 25 }).map((_, i) => ({
        id: productionId(i + 1),
        slug: `test-theater-${i + 1}`,
        title_nl: `Test Theater ${i + 1}`,
        title_en: `Test Theater ${i + 1}`,
        description_nl: `Beschrijving ${i + 1}`,
        description_en: `Description ${i + 1}`,
    }));

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
            await route.fulfill({ json: [] });
            return;
        }
        if (id && /^[0-9a-f-]{36}$/i.test(id)) {
            const one = productions.find((p) => p.id === id) ?? productions[0];
            await route.fulfill({ json: one });
            return;
        }
        await route.fulfill({ json: productions });
    });

    // Mock events
    await page.route("**/api/events**", async (route) => {
        await route.fulfill({ json: [] });
    });

    // Mock locations
    await page.route("**/api/locations**", async (route) => {
        await route.fulfill({ json: [] });
    });

    // Mock facets
    await page.route("**/api/taxonomy/facets**", async (route) => {
        await route.fulfill({ json: [] });
    });
}
