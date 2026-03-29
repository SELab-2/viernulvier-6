import { describe, expect, it } from "vitest";

import { getLocalizedField } from "@/lib/locale";
import type { Production } from "@/types/models/production.types";

const baseProduction: Production = {
    id: "test-id",
    sourceId: null,
    slug: "test-slug",
    supertitleNl: null,
    supertitleEn: null,
    titleNl: "Nederlandse Titel",
    titleEn: "English Title",
    artistNl: "Nederlandse Artiest",
    artistEn: null,
    metaTitleNl: null,
    metaTitleEn: null,
    metaDescriptionNl: null,
    metaDescriptionEn: null,
    taglineNl: "Een tagline",
    taglineEn: "A tagline",
    teaserNl: null,
    teaserEn: null,
    descriptionNl: null,
    descriptionEn: null,
    descriptionExtraNl: null,
    descriptionExtraEn: null,
    description2Nl: null,
    description2En: null,
    video1: null,
    video2: null,
    quoteNl: null,
    quoteEn: null,
    quoteSourceNl: null,
    quoteSourceEn: null,
    programmeNl: null,
    programmeEn: null,
    infoNl: null,
    infoEn: null,
    descriptionShortNl: null,
    descriptionShortEn: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: null,
};

describe("getLocalizedField", () => {
    it("returns the Dutch value when locale is nl", () => {
        expect(getLocalizedField(baseProduction, "title", "nl")).toBe("Nederlandse Titel");
        expect(getLocalizedField(baseProduction, "artist", "nl")).toBe("Nederlandse Artiest");
        expect(getLocalizedField(baseProduction, "tagline", "nl")).toBe("Een tagline");
    });

    it("returns the English value when locale is en", () => {
        expect(getLocalizedField(baseProduction, "title", "en")).toBe("English Title");
        expect(getLocalizedField(baseProduction, "tagline", "en")).toBe("A tagline");
    });

    it("returns null when the requested locale field is null", () => {
        // artistEn is null in the fixture
        expect(getLocalizedField(baseProduction, "artist", "en")).toBeNull();
    });

    it("returns null when both locale fields are null", () => {
        // supertitleNl and supertitleEn are both null
        expect(getLocalizedField(baseProduction, "supertitle", "nl")).toBeNull();
        expect(getLocalizedField(baseProduction, "supertitle", "en")).toBeNull();
    });

    it("does not fall back to the other locale", () => {
        // artistEn is null — should NOT return artistNl
        const result = getLocalizedField(baseProduction, "artist", "en");
        expect(result).toBeNull();
        expect(result).not.toBe("Nederlandse Artiest");
    });

    it("handles all supported bilingual fields", () => {
        const fields = [
            "supertitle",
            "title",
            "artist",
            "metaTitle",
            "metaDescription",
            "tagline",
            "teaser",
            "description",
            "descriptionExtra",
            "description2",
            "quote",
            "quoteSource",
            "programme",
            "info",
            "descriptionShort",
        ] as const;

        for (const field of fields) {
            // Should not throw for any valid field
            expect(() => getLocalizedField(baseProduction, field, "nl")).not.toThrow();
            expect(() => getLocalizedField(baseProduction, field, "en")).not.toThrow();
        }
    });

    it("defaults to Dutch for unknown locales", () => {
        expect(getLocalizedField(baseProduction, "title", "fr")).toBe("Nederlandse Titel");
        expect(getLocalizedField(baseProduction, "title", "de")).toBe("Nederlandse Titel");
    });
});
