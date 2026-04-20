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

    test("Map stepper step is rendered but not active when no session is loaded", async ({
        page,
    }) => {
        await page.goto("/nl/cms/import");
        await page.waitForLoadState("networkidle");

        // Upload step is the active step
        const uploadStep = page.getByText("Uploaden").locator("..");
        await expect(uploadStep.locator("[aria-current='step']")).toBeVisible();

        // Map step label is visible but its circle does not carry aria-current="step"
        await expect(page.getByText("Mappen")).toBeVisible();
        const mapCircles = page.locator("[aria-current='step']");
        await expect(mapCircles).toHaveCount(1);
    });
});
