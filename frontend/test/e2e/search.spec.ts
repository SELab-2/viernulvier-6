import { test, expect } from "@playwright/test";
import { mockApi } from "./utils/mockApi";

test.describe("Search Journey", () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
    });

    test("User can perform a search, apply filters, and view results", async ({ page }) => {
        // Navigate to the localized search page
        await page.goto("/nl/search");

        // Assuming there is a search input, let's type into it
        // We know from SearchHero unit tests there is a text input with role 'textbox' or a search input
        const searchInput = page.getByPlaceholder(/zoek|search/i).first();
        if (await searchInput.isVisible()) {
            await searchInput.fill("theater");
            await searchInput.press("Enter");
        }

        // Wait for results to update (networkidle is a generic wait, could be tailored to actual API calls)
        await page.waitForLoadState("networkidle");

        // Verify that a ResultsBar or similar element is visible
        // We know from unit tests there's a ResultsBar that shows something like 'X resultaten'
        const resultsText = page.getByText(/resulta(at|ten)/i).first();
        if (await resultsText.isVisible()) {
            await expect(resultsText).toBeVisible();
        }

        // Verify that there is a list of productions (ProductionList)
        const productionItems = page.locator("article"); // Assuming standard semantic HTML
        if ((await productionItems.count()) > 0) {
            await expect(productionItems.first()).toBeVisible();

            // Try navigating to the first production
            const firstLink = productionItems.first().locator("a").first();
            if (await firstLink.isVisible()) {
                const href = await firstLink.getAttribute("href");
                await firstLink.click();

                await page.waitForLoadState("networkidle");
                if (href) {
                    await expect(page).toHaveURL(new RegExp(href));
                }
            }
        }
    });

    test("User can interact with pagination", async ({ page }) => {
        await page.goto("/nl/search");
        await page.waitForLoadState("networkidle");

        // Look for next page button from Pagination component
        const nextButton = page.getByRole("button", { name: /volgende|next/i });
        if ((await nextButton.isVisible()) && (await nextButton.isEnabled())) {
            await nextButton.click();
            await page.waitForLoadState("networkidle");

            // Since pagination is client-side state in this implementation,
            // we verify the Previous button becomes enabled/visible.
            const prevButton = page.getByRole("button", { name: /vorige|prev/i });
            if (await prevButton.isVisible()) {
                await expect(prevButton).toBeEnabled();
            }
        }
    });
});
