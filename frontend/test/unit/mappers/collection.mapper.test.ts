import { describe, expect, it } from "vitest";

import { mapCollection } from "@/mappers/collection.mapper";

const baseCollectionDto = {
    id: "coll-1",
    slug: "test-collection",
    translations: [],
    items: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
};

describe("collection mapper", () => {
    it("maps id and slug to domain model", () => {
        const result = mapCollection(baseCollectionDto);
        expect(result.id).toBe("coll-1");
        expect(result.slug).toBe("test-collection");
    });

    it("maps cover_image_url to coverImageUrl", () => {
        const result = mapCollection({
            ...baseCollectionDto,
            cover_image_url: "https://cdn/x.jpg",
        });
        expect(result.coverImageUrl).toBe("https://cdn/x.jpg");
    });

    it("maps missing cover_image_url to null", () => {
        const result = mapCollection(baseCollectionDto);
        expect(result.coverImageUrl).toBeNull();
    });
});
