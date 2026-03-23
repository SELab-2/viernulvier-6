import { describe, expect, it } from "vitest";

import { mapFacet, mapFacets, mapTag } from "@/mappers/taxonomy.mapper";

describe("taxonomy mapper", () => {
    it("maps tag response to domain model", () => {
        const mapped = mapTag({
            slug: "theater",
            label: "Theater",
            sort_order: 1,
        });

        expect(mapped.slug).toBe("theater");
        expect(mapped.label).toBe("Theater");
        expect(mapped.sortOrder).toBe(1);
    });

    it("maps facet response to domain model", () => {
        const mapped = mapFacet({
            slug: "discipline",
            label: "Discipline",
            tags: [
                { slug: "theater", label: "Theater", sort_order: 1 },
                { slug: "music", label: "Music", sort_order: 2 },
            ],
        });

        expect(mapped.slug).toBe("discipline");
        expect(mapped.label).toBe("Discipline");
        expect(mapped.tags).toHaveLength(2);
        expect(mapped.tags[0]).toEqual({ slug: "theater", label: "Theater", sortOrder: 1 });
    });

    it("maps facets array", () => {
        const mapped = mapFacets([
            { slug: "discipline", label: "Discipline", tags: [] },
            { slug: "format", label: "Format", tags: [] },
        ]);

        expect(mapped).toHaveLength(2);
        expect(mapped[0].slug).toBe("discipline");
        expect(mapped[1].slug).toBe("format");
    });
});
