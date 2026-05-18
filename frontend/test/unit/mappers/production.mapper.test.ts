import { describe, expect, it } from "vitest";

import {
    mapCreateProductionInput,
    mapProduction,
    mapPaginatedProductionsResult,
    mapUpdateProductionInput,
} from "@/mappers/production.mapper";
import type { ProductionResponse } from "@/types/api/production.api.types";

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

    it("maps slim tags from the API response", () => {
        const mapped = mapProduction({
            id: "11111111-1111-1111-1111-111111111111",
            slug: "p1",
            translations: [],
            tags: [
                { slug: "concert", facet: "discipline" },
                { slug: "workshop", facet: "format" },
            ],
        } as unknown as Parameters<typeof mapProduction>[0]);
        expect(mapped.tags).toEqual([
            { slug: "concert", facet: "discipline" },
            { slug: "workshop", facet: "format" },
        ]);
    });

    it("defaults tags to an empty array when missing", () => {
        const mapped = mapProduction({
            id: "11111111-1111-1111-1111-111111111111",
            slug: "p1",
            translations: [],
        });
        expect(mapped.tags).toEqual([]);
    });

    it("maps locations from API response to location summaries", () => {
        const response: ProductionResponse = {
            id: "id-1",
            slug: "slug",
            translations: [],
            locations: [
                {
                    id: "loc-1",
                    slug: "main-venue",
                    name: "Main Venue",
                },
                {
                    id: "loc-2",
                    slug: null,
                    name: null,
                },
            ],
        };

        const mapped = mapProduction(response);
        expect(mapped.locations).toHaveLength(2);
        expect(mapped.locations[0]).toEqual({
            id: "loc-1",
            slug: "main-venue",
            name: "Main Venue",
        });
        expect(mapped.locations[1]).toEqual({
            id: "loc-2",
            slug: null,
            name: null,
        });
    });

    it("defaults locations to an empty array when missing", () => {
        const mapped = mapProduction({
            id: "id-1",
            slug: "p1",
            translations: [],
        });
        expect(mapped.locations).toEqual([]);
    });

    it("maps create input with full translation fields", () => {
        const payload = mapCreateProductionInput({
            slug: "full-prod",
            sourceId: 42,
            video1: "https://example.com/v1.mp4",
            video2: "https://example.com/v2.mp4",
            eticketInfo: "Free entry",
            uitdatabankTheme: "music",
            uitdatabankType: "concert",
            translations: [
                {
                    languageCode: "en",
                    title: "My Show",
                    supertitle: "A Production",
                    artist: "Artist Name",
                    tagline: "Best show ever",
                    description: "A long description",
                    descriptionExtra: "Extra info",
                    quote: "Amazing",
                    quoteSource: "The Times",
                },
            ],
        });

        expect(payload.source_id).toBe(42);
        expect(payload.video_1).toBe("https://example.com/v1.mp4");
        expect(payload.video_2).toBe("https://example.com/v2.mp4");
        expect(payload.eticket_info).toBe("Free entry");
        expect(payload.uitdatabank_theme).toBe("music");
        expect(payload.uitdatabank_type).toBe("concert");
        const tr = payload.translations?.[0];
        expect(tr?.language_code).toBe("en");
        expect(tr?.title).toBe("My Show");
        expect(tr?.supertitle).toBe("A Production");
        expect(tr?.artist).toBe("Artist Name");
        expect(tr?.tagline).toBe("Best show ever");
        expect(tr?.description).toBe("A long description");
        expect(tr?.description_extra).toBe("Extra info");
        expect(tr?.quote).toBe("Amazing");
        expect(tr?.quote_source).toBe("The Times");
    });

    it("maps paginated productions result", () => {
        const response = {
            data: [
                { id: "p1", slug: "a", translations: [] },
                { id: "p2", slug: "b", translations: [] },
            ],
            next_cursor: "cursor-abc",
        };

        const result = mapPaginatedProductionsResult(response);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe("p1");
        expect(result.data[1].id).toBe("p2");
        expect(result.nextCursor).toBe("cursor-abc");
    });

    it("maps paginated productions result with null next_cursor", () => {
        const response = {
            data: [{ id: "p1", slug: "a", translations: [] }],
            next_cursor: null,
        };

        const result = mapPaginatedProductionsResult(response);
        expect(result.nextCursor).toBeNull();
    });
});
