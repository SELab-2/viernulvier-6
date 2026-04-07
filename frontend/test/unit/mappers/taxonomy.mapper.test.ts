import { describe, expect, it } from "vitest";

import { mapFacet, mapFacets, mapTag } from "@/mappers/taxonomy.mapper";

describe("taxonomy mapper", () => {
    it("maps tag response to domain model", () => {
        const mapped = mapTag({
            slug: "theatre",
            sort_order: 1,
            translations: [
                { language_code: "nl", label: "Theater", description: null },
                { language_code: "en", label: "Theatre", description: null },
            ],
        });

        expect(mapped.slug).toBe("theatre");
        expect(mapped.sortOrder).toBe(1);
        const nl = mapped.translations.find((t) => t.languageCode === "nl");
        const en = mapped.translations.find((t) => t.languageCode === "en");
        expect(nl?.label).toBe("Theater");
        expect(en?.label).toBe("Theatre");
        expect(nl?.description).toBeNull();
    });

    it("maps facet response to domain model", () => {
        const mapped = mapFacet({
            slug: "discipline",
            translations: [
                { language_code: "nl", label: "Discipline" },
                { language_code: "en", label: "Discipline" },
            ],
            tags: [
                {
                    slug: "theatre",
                    sort_order: 1,
                    translations: [
                        { language_code: "nl", label: "Theater", description: null },
                        { language_code: "en", label: "Theatre", description: null },
                    ],
                },
                {
                    slug: "music",
                    sort_order: 2,
                    translations: [
                        { language_code: "nl", label: "Muziek", description: null },
                        { language_code: "en", label: "Music", description: null },
                    ],
                },
            ],
        });

        expect(mapped.slug).toBe("discipline");
        expect(mapped.translations.find((t) => t.languageCode === "nl")?.label).toBe("Discipline");
        expect(mapped.tags).toHaveLength(2);
        expect(mapped.tags[0]).toEqual({
            slug: "theatre",
            sortOrder: 1,
            translations: [
                { languageCode: "nl", label: "Theater", description: null },
                { languageCode: "en", label: "Theatre", description: null },
            ],
        });
    });

    it("maps facets array", () => {
        const mapped = mapFacets([
            {
                slug: "discipline",
                translations: [
                    { language_code: "nl", label: "Discipline" },
                    { language_code: "en", label: "Discipline" },
                ],
                tags: [],
            },
            {
                slug: "format",
                translations: [
                    { language_code: "nl", label: "Formaat" },
                    { language_code: "en", label: "Format" },
                ],
                tags: [],
            },
        ]);

        expect(mapped).toHaveLength(2);
        expect(mapped[0].slug).toBe("discipline");
        expect(mapped[1].translations.find((t) => t.languageCode === "nl")?.label).toBe("Formaat");
    });
});
