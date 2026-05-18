import { describe, expect, it } from "vitest";

import { getCmsFacetParams } from "@/lib/cms-filter-params";

describe("getCmsFacetParams", () => {
    it("returns only supported CMS facet query params", () => {
        const searchParams = new URLSearchParams({
            q: "concert",
            discipline: "theatre,dance",
            theme: "politics",
            cursor: "next-page",
            unknown: "ignored",
        });

        expect(getCmsFacetParams(searchParams)).toEqual({
            discipline: "theatre,dance",
            theme: "politics",
        });
    });

    it("drops empty facet values", () => {
        const searchParams = new URLSearchParams("discipline=&format=workshop");

        expect(getCmsFacetParams(searchParams)).toEqual({
            format: "workshop",
        });
    });
});
