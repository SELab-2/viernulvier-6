import { describe, expect, it } from "vitest";

import {
    mapCreateProductionInput,
    mapProduction,
    mapUpdateProductionInput,
} from "@/mappers/production.mapper";

describe("production mapper", () => {
    it("maps response and normalizes optional fields to null", () => {
        const mapped = mapProduction({
            id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            source_id: undefined,
            slug: "slug",
            supertitle_nl: undefined,
            supertitle_en: null,
            title_nl: "NL",
            title_en: "EN",
            artist_nl: undefined,
            artist_en: undefined,
            meta_title_nl: undefined,
            meta_title_en: undefined,
            meta_description_nl: undefined,
            meta_description_en: undefined,
            tagline_nl: undefined,
            tagline_en: undefined,
            teaser_nl: undefined,
            teaser_en: undefined,
            description_nl: undefined,
            description_en: undefined,
            description_extra_nl: undefined,
            description_extra_en: undefined,
            description_2_nl: undefined,
            description_2_en: undefined,
            video_1: undefined,
            video_2: undefined,
            quote_nl: undefined,
            quote_en: undefined,
            quote_source_nl: undefined,
            quote_source_en: undefined,
            programme_nl: undefined,
            programme_en: undefined,
            info_nl: undefined,
            info_en: undefined,
            description_short_nl: undefined,
            description_short_en: undefined,
            eticket_info: undefined,
            uitdatabank_theme: undefined,
            uitdatabank_type: undefined,
        });

        expect(mapped.sourceId).toBeNull();
        expect(mapped.supertitleNl).toBeNull();
        expect(mapped.titleNl).toBe("NL");
        expect(mapped.titleEn).toBe("EN");
    });

    it("maps create/update input to api payload", () => {
        const createPayload = mapCreateProductionInput({
            slug: "new",
            titleNl: "Titel",
        });

        expect(createPayload.slug).toBe("new");
        expect(createPayload.title_nl).toBe("Titel");

        const updatePayload = mapUpdateProductionInput({ id: "id-1", slug: "updated" });
        expect(updatePayload.id).toBe("id-1");
        expect(updatePayload.slug).toBe("updated");
    });
});
