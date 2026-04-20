import { test, expect } from "@playwright/test";
import { mockApi } from "./utils/mockApi";

test.describe("CMS Import page", () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
    });

    test("shows the stepper and upload heading on the import page", async ({ page }) => {
        await page.goto("/nl/cms/import");
        await page.waitForLoadState("networkidle");

        // The page title heading from PageHeader
        await expect(page.getByText("Import")).toBeVisible();

        // The upload stage heading (Dutch locale)
        await expect(page.getByText("CSV-bestand uploaden")).toBeVisible();
    });
});
