import { test, expect } from "@playwright/test";
import { mockApi } from "./utils/mockApi";

test.describe("Entity tag chips on list surfaces", () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
    });

    test("search page production list renders tag chips", async ({ page }) => {
        await page.goto("/nl/search");
        await page.waitForLoadState("networkidle");

        const chips = page.locator('[data-testid="entity-tag-chip"]');
        await expect(chips.first()).toBeVisible();
        await expect(chips.first()).toHaveText("Concert");
    });

    test("public articles list renders tag chips", async ({ page }) => {
        await page.goto("/nl/articles");
        await page.waitForLoadState("networkidle");

        const chips = page.locator('[data-testid="entity-tag-chip"]');
        await expect(chips.first()).toBeVisible();
        await expect(chips.first()).toHaveText("Concert");
    });
});
