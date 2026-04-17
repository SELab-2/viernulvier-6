import { test, expect } from "@playwright/test";
import { mockApi } from "./utils/mockApi";

test.describe("Articles Page", () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
    });

    test("should display the articles list page with published articles", async ({ page }) => {
        await page.goto("/nl/articles");
        await page.waitForLoadState("networkidle");

        // Hero section should be visible
        await expect(page.locator("h1")).toContainText("Artikels");

        // Both articles should be rendered
        await expect(page.getByText("Kleurenstudies van De Vooruit")).toBeVisible();
        await expect(page.getByText("De Balzaal door de jaren heen")).toBeVisible();
    });

    test("should navigate from article list to article detail", async ({ page }) => {
        await page.goto("/nl/articles");
        await page.waitForLoadState("networkidle");

        // Click the first article
        await page.getByText("Kleurenstudies van De Vooruit").first().click();

        // Should navigate to the detail page
        await page.waitForURL("**/articles/kleurenstudies-van-de-vooruit");
        await page.waitForLoadState("networkidle");

        // Article title should be visible in the detail header
        const heading = page.locator("h1");
        await expect(heading).toContainText("Kleurenstudies van De Vooruit");

        // Tiptap rendered content should be visible
        await expect(page.getByText("Het begin")).toBeVisible();
        await expect(
            page.getByText("In de jaren 60 begon een revolutie in de kunstwereld van Gent.")
        ).toBeVisible();
    });

    test("should have a back link that navigates to the articles list", async ({ page }) => {
        await page.goto("/nl/articles/kleurenstudies-van-de-vooruit");
        await page.waitForLoadState("networkidle");

        // Click back link
        const backLink = page.getByText(/terug naar artikels/i);
        await expect(backLink).toBeVisible();
        await backLink.click();

        await page.waitForURL("**/articles");
        await expect(page.getByText("Kleurenstudies van De Vooruit")).toBeVisible();
    });

    test("should show the articles nav link in the header", async ({ page }) => {
        await page.goto("/nl/articles");
        await page.waitForLoadState("networkidle");

        // The header should have an Artikels nav link
        const artikelsLink = page.locator("header").getByText("Artikels", { exact: true });
        await expect(artikelsLink).toBeVisible();
    });

    test("should show connected entities and related articles on detail page", async ({ page }) => {
        await page.goto("/nl/articles/kleurenstudies-van-de-vooruit");
        await page.waitForLoadState("networkidle");

        // Static connected entities section
        await expect(page.getByText("Gekoppeld aan")).toBeVisible();
        await expect(page.getByText("Koppelingen binnenkort beschikbaar")).toBeVisible();

        // Static related articles section
        await expect(page.getByText("Meer artikels")).toBeVisible();
        await expect(page.getByText("De Balzaal door de jaren heen")).toBeVisible();
    });

    test("should display the dateline bar with dates on detail page", async ({ page }) => {
        await page.goto("/nl/articles/kleurenstudies-van-de-vooruit");
        await page.waitForLoadState("networkidle");

        // Dateline brand should be visible
        await expect(page.getByText("Archiefdienst")).toBeVisible();

        // Subject period should be shown
        await expect(page.getByText("1960-01-01 — 1970-12-31")).toBeVisible();
    });
});
