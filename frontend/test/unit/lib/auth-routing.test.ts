import { describe, expect, it } from "vitest";

import { isProtectedApiRequest, isProtectedRoute } from "@/lib/auth-routing";

describe("auth routing helpers", () => {
    it.each(["/cms", "/cms/articles", "/nl/cms", "/en/cms/productions/123/edit", "/admin"])(
        "marks %s as protected",
        (pathname) => {
            expect(isProtectedRoute(pathname)).toBe(true);
        }
    );

    it.each(["/", "/nl", "/en/search", "/articles/story", "/nl/login", "/api/v1/productions"])(
        "leaves %s public",
        (pathname) => {
            expect(isProtectedRoute(pathname)).toBe(false);
        }
    );

    it.each([
        "/editor/me",
        "/articles/cms",
        "/articles/cms/search",
        "/collections/123/items",
        "/import-errors",
        "/media/upload-url",
        "/taxonomy/tags",
    ])("marks %s as a protected API request", (url) => {
        expect(isProtectedApiRequest(url)).toBe(true);
    });

    it.each([
        "/productions",
        "/productions/123",
        "/articles",
        "/collections/by-slug/test",
        "/auth/login",
        "/auth/logout",
        "/auth/refresh",
        "/taxonomy/facets",
    ])("does not refresh auth for public API request %s", (url) => {
        expect(isProtectedApiRequest(url)).toBe(false);
    });
});
