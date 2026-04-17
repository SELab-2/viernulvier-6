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
            video_1: undefined,
            video_2: undefined,
            eticket_info: undefined,
            uitdatabank_theme: undefined,
            uitdatabank_type: undefined,
            translations: [
                {
                    language_code: "nl",
                    supertitle: undefined,
                    title: "NL",
                    artist: undefined,
                    meta_title: undefined,
                    meta_description: undefined,
                    tagline: undefined,
                    teaser: undefined,
                    description: undefined,
                    description_extra: undefined,
                    description_2: undefined,
                    quote: undefined,
                    quote_source: undefined,
                    programme: undefined,
                    info: undefined,
                    description_short: undefined,
                },
                {
                    language_code: "en",
                    supertitle: null,
                    title: "EN",
                    artist: undefined,
                    meta_title: undefined,
                    meta_description: undefined,
                    tagline: undefined,
                    teaser: undefined,
                    description: undefined,
                    description_extra: undefined,
                    description_2: undefined,
                    quote: undefined,
                    quote_source: undefined,
                    programme: undefined,
                    info: undefined,
                    description_short: undefined,
                },
            ],
        });

        expect(mapped.sourceId).toBeNull();
        const nl = mapped.translations.find((t) => t.languageCode === "nl");
        const en = mapped.translations.find((t) => t.languageCode === "en");
        expect(nl?.supertitle).toBeNull();
        expect(nl?.title).toBe("NL");
        expect(en?.title).toBe("EN");
    });

    it("maps cover_image_url to coverImageUrl when present", () => {
        const mapped = mapProduction({
            id: "id-1",
            slug: "slug",
            translations: [],
            cover_image_url: "https://s3.example.com/media/cover.jpg",
        } as unknown as Parameters<typeof mapProduction>[0]);
        expect(mapped.coverImageUrl).toBe("https://s3.example.com/media/cover.jpg");
    });

    it("normalizes missing cover_image_url to null", () => {
        const mapped = mapProduction({
            id: "id-1",
            slug: "slug",
            translations: [],
        });
        expect(mapped.coverImageUrl).toBeNull();
    });

    it("maps create/update input to api payload", () => {
        const createPayload = mapCreateProductionInput({
            slug: "new",
            translations: [{ languageCode: "nl", title: "Titel" }],
        });

        expect(createPayload.slug).toBe("new");
        expect(createPayload.translations).toHaveLength(1);
        expect(createPayload.translations?.[0]?.language_code).toBe("nl");
        expect(createPayload.translations?.[0]?.title).toBe("Titel");

        const updatePayload = mapUpdateProductionInput({ id: "id-1", slug: "updated" });
        expect(updatePayload.id).toBe("id-1");
        expect(updatePayload.slug).toBe("updated");
    });
});
