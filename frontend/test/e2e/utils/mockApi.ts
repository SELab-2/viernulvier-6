import { Page } from "@playwright/test";

/**
 * Mocks the backend API responses for E2E tests.
 *
 * TODO: Eventually, we may want to test against the real Rust API backend
 * by spinning up the database and backend in a dedicated full-stack CI workflow.
 * For now, this isolates the frontend tests and makes them fast and reliable.
 */
export async function mockApi(page: Page) {
    // Mock productions (return enough items to trigger pagination > 20 items)
    await page.route("**/api/v1/productions*", async (route) => {
        const productions = Array.from({ length: 25 }).map((_, i) => ({
            id: `prod-${i + 1}`,
            slug: `test-theater-${i + 1}`,
            title: { nl: `Test Theater ${i + 1}` },
            description: { nl: `Beschrijving ${i + 1}` },
            publishDate: "2024-01-01T00:00:00Z",
        }));
        await route.fulfill({ json: productions });
    });

    // Mock events
    await page.route("**/api/v1/events*", async (route) => {
        await route.fulfill({ json: [] });
    });

    // Mock locations
    await page.route("**/api/v1/locations*", async (route) => {
        await route.fulfill({ json: [] });
    });

    // Mock facets
    await page.route("**/api/v1/taxonomy/facets*", async (route) => {
        await route.fulfill({ json: [] });
    });
}
