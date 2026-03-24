import { describe, expect, it } from "vitest";

import { mapFacet, mapFacets, mapTag } from "@/mappers/taxonomy.mapper";

describe("taxonomy mapper", () => {
    it("maps tag response to domain model", () => {
        const mapped = mapTag({
            slug: "theatre",
            sort_order: 1,
            translations: {
                nl: { label: "Theater", description: null },
                en: { label: "Theatre", description: null },
            },
        });

        expect(mapped.slug).toBe("theatre");
        expect(mapped.sortOrder).toBe(1);
        expect(mapped.translations.nl?.label).toBe("Theater");
        expect(mapped.translations.en?.label).toBe("Theatre");
        expect(mapped.translations.nl?.description).toBeNull();
    });

    it("maps facet response to domain model", () => {
        const mapped = mapFacet({
            slug: "discipline",
            translations: {
                nl: { label: "Discipline" },
                en: { label: "Discipline" },
            },
            tags: [
                {
                    slug: "theatre",
                    sort_order: 1,
                    translations: {
                        nl: { label: "Theater", description: null },
                        en: { label: "Theatre", description: null },
                    },
                },
                {
                    slug: "music",
                    sort_order: 2,
                    translations: {
                        nl: { label: "Muziek", description: null },
                        en: { label: "Music", description: null },
                    },
                },
            ],
        });

        expect(mapped.slug).toBe("discipline");
        expect(mapped.translations.nl?.label).toBe("Discipline");
        expect(mapped.tags).toHaveLength(2);
        expect(mapped.tags[0]).toEqual({
            slug: "theatre",
            sortOrder: 1,
            translations: {
                nl: { label: "Theater", description: null },
                en: { label: "Theatre", description: null },
            },
        });
    });

    it("maps facets array", () => {
        const mapped = mapFacets([
            {
                slug: "discipline",
                translations: { nl: { label: "Discipline" }, en: { label: "Discipline" } },
                tags: [],
            },
            {
                slug: "format",
                translations: { nl: { label: "Formaat" }, en: { label: "Format" } },
                tags: [],
            },
        ]);

        expect(mapped).toHaveLength(2);
        expect(mapped[0].slug).toBe("discipline");
        expect(mapped[1].translations.nl?.label).toBe("Formaat");
    });
});
