import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";

describe("queryKeys", () => {
    it("returns stable collection keys", () => {
        expect(queryKeys.user).toEqual(["user"]);
        expect(queryKeys.version).toEqual(["version"]);
        expect(queryKeys.locations.all).toEqual(["locations"]);
        expect(queryKeys.productions.all).toEqual(["productions"]);
        expect(queryKeys.events.all).toEqual(["events"]);
        expect(queryKeys.halls.all).toEqual(["halls"]);
        expect(queryKeys.spaces.all).toEqual(["spaces"]);
    });

    it("builds deterministic detail keys", () => {
        expect(queryKeys.locations.detail("id-1")).toEqual(["locations", "id-1"]);
        expect(queryKeys.productions.detail("id-2")).toEqual(["productions", "id-2"]);
        expect(queryKeys.events.detail("id-3")).toEqual(["events", "id-3"]);
        expect(queryKeys.halls.detail("id-4")).toEqual(["halls", "id-4"]);
        expect(queryKeys.spaces.detail("id-5")).toEqual(["spaces", "id-5"]);
    });

    it("builds production events keys", () => {
        expect(queryKeys.productions.events("prod-1")).toEqual(["productions", "prod-1", "events"]);
    });

    it("builds taxonomy facet keys", () => {
        expect(queryKeys.taxonomy.facets()).toEqual(["taxonomy", "facets"]);
        expect(queryKeys.taxonomy.facets("production")).toEqual([
            "taxonomy",
            "facets",
            "production",
        ]);
    });
});
