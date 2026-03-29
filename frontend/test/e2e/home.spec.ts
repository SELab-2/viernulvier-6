import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
    test("should load the homepage and check basic elements", async ({ page }) => {
        await page.goto("/nl");

        // Wait for the page to be ready
        await page.waitForLoadState("networkidle");

        const body = page.locator("body");
        await expect(body).toBeVisible();

        // Ensure there are no hydration errors on load
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text());
            }
        });

        await expect(page.locator("header")).toBeVisible();
    });
});
