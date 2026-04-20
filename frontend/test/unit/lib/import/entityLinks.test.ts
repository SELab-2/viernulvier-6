import { describe, expect, it } from "vitest";
import { cmsEditUrl, publicSiteUrl } from "@/lib/import/entityLinks";

describe("cmsEditUrl", () => {
    it("returns correct URL for production", () => {
        expect(cmsEditUrl("production", "abc-123")).toBe("/cms/productions/abc-123/edit");
    });

    it("returns correct URL for event", () => {
        expect(cmsEditUrl("event", "evt-456")).toBe("/cms/events/evt-456/edit");
    });

    it("returns correct URL for article", () => {
        expect(cmsEditUrl("article", "art-789")).toBe("/cms/articles/art-789/edit");
    });

    it("returns correct URL for location", () => {
        expect(cmsEditUrl("location", "loc-111")).toBe("/cms/locations/loc-111/edit");
    });

    it("returns correct URL for artist", () => {
        expect(cmsEditUrl("artist", "per-222")).toBe("/cms/performers/per-222/edit");
    });

    it("throws for unknown entity type", () => {
        expect(() => cmsEditUrl("unknown", "id-000")).toThrow("Unknown entity type unknown");
    });
});

describe("publicSiteUrl", () => {
    it("returns null for null slug", () => {
        expect(publicSiteUrl("production", null)).toBeNull();
    });

    it("returns production URL for production with slug", () => {
        expect(publicSiteUrl("production", "mijn-stuk")).toBe("/productions/mijn-stuk");
    });

    it("returns article URL for article with slug", () => {
        expect(publicSiteUrl("article", "mijn-artikel")).toBe("/articles/mijn-artikel");
    });

    it("returns location URL for location with slug", () => {
        expect(publicSiteUrl("location", "ntgent")).toBe("/locations/ntgent");
    });

    it("returns null for event (no public slug page)", () => {
        expect(publicSiteUrl("event", "some-slug")).toBeNull();
    });

    it("returns null for artist (no public slug page)", () => {
        expect(publicSiteUrl("artist", "some-slug")).toBeNull();
    });
});
