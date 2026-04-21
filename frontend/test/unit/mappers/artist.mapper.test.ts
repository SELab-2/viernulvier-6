import { describe, expect, it } from "vitest";

import { mapArtist } from "@/mappers/artist.mapper";

const baseArtistDto = {
    id: "artist-1",
    slug: "test-artist",
    name: "Test Artist",
};

describe("artist mapper", () => {
    it("maps id, slug, and name to domain model", () => {
        const result = mapArtist(baseArtistDto);
        expect(result.id).toBe("artist-1");
        expect(result.slug).toBe("test-artist");
        expect(result.name).toBe("Test Artist");
    });

    it("maps cover_image_url to coverImageUrl", () => {
        const result = mapArtist({
            ...baseArtistDto,
            cover_image_url: "https://cdn/x.jpg",
        });
        expect(result.coverImageUrl).toBe("https://cdn/x.jpg");
    });

    it("maps missing cover_image_url to null", () => {
        const result = mapArtist(baseArtistDto);
        expect(result.coverImageUrl).toBeNull();
    });
});
