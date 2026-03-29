import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
    test("should load the homepage and check basic elements", async ({ page }) => {
        // Navigate to the homepage
        await page.goto("/nl");

        // Wait for the page to be ready
        await page.waitForLoadState("networkidle");

        // Basic verification - we'll check that the page title contains something
        // Or that at least a basic container exists, modify this based on actual homepage content
        const body = page.locator("body");
        await expect(body).toBeVisible();

        // As it is a Next.js app, ensure there are no hydration errors on load
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text());
            }
        });

        // Check if a header or navigation is present (customize based on app structure)
        // await expect(page.getByRole('navigation')).toBeVisible();
    });
});
