import { describe, expect, it } from "vitest";

import {
    mapMedia,
    mapMediaVariant,
    mapMediaList,
    mapAttachMediaInput,
    mapUploadUrlInput,
    mapUploadUrlResult,
} from "@/mappers/media.mapper";

describe("media mapper", () => {
    const apiVariant = {
        id: "v-1",
        media_id: "m-1",
        variant_kind: "crop",
        crop_name: "hd_ready",
        url: "https://s3.example.com/crop.jpg",
        mime_type: "image/jpeg",
        file_size: 50000,
        width: 640,
        height: 360,
        checksum: "abc123",
        source_uri: "https://cdn.example.com/crop.jpg",
    };

    const apiMedia = {
        id: "m-1",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        url: "https://s3.example.com/image.jpg",
        mime_type: "image/jpeg",
        file_size: 120000,
        width: 1920,
        height: 1080,
        checksum: "sha256-abc",
        alt_text_nl: "Alt NL",
        alt_text_en: "Alt EN",
        alt_text_fr: null,
        description_nl: "Beschrijving",
        description_en: null,
        description_fr: null,
        credit_nl: "Fotograaf",
        credit_en: null,
        credit_fr: null,
        geo_latitude: 51.05,
        geo_longitude: 3.72,
        parent_id: null,
        derivative_type: null,
        gallery_type: "gallery",
        source_system: "api-importer",
        source_uri: "https://cdn.example.com/image.jpg",
        crops: [apiVariant],
    };

    describe("mapMediaVariant", () => {
        it("maps snake_case to camelCase", () => {
            const result = mapMediaVariant(apiVariant);
            expect(result.id).toBe("v-1");
            expect(result.mediaId).toBe("m-1");
            expect(result.variantKind).toBe("crop");
            expect(result.cropName).toBe("hd_ready");
            expect(result.url).toBe("https://s3.example.com/crop.jpg");
            expect(result.mimeType).toBe("image/jpeg");
            expect(result.fileSize).toBe(50000);
            expect(result.width).toBe(640);
            expect(result.height).toBe(360);
        });

        it("normalizes undefined/null fields to null", () => {
            const result = mapMediaVariant({
                id: "v-2",
                media_id: "m-2",
                variant_kind: "crop",
                crop_name: undefined,
                url: undefined,
                mime_type: undefined,
                file_size: undefined,
                width: undefined,
                height: undefined,
                checksum: undefined,
                source_uri: undefined,
            });
            expect(result.cropName).toBeNull();
            expect(result.url).toBeNull();
            expect(result.mimeType).toBeNull();
        });
    });

    describe("mapMedia", () => {
        it("maps all fields from API response", () => {
            const result = mapMedia(apiMedia);
            expect(result.id).toBe("m-1");
            expect(result.createdAt).toBe("2026-01-01T00:00:00Z");
            expect(result.updatedAt).toBe("2026-01-02T00:00:00Z");
            expect(result.url).toBe("https://s3.example.com/image.jpg");
            expect(result.mimeType).toBe("image/jpeg");
            expect(result.fileSize).toBe(120000);
            expect(result.width).toBe(1920);
            expect(result.height).toBe(1080);
            expect(result.altTextNl).toBe("Alt NL");
            expect(result.altTextEn).toBe("Alt EN");
            expect(result.altTextFr).toBeNull();
            expect(result.descriptionNl).toBe("Beschrijving");
            expect(result.creditNl).toBe("Fotograaf");
            expect(result.geoLatitude).toBe(51.05);
            expect(result.geoLongitude).toBe(3.72);
            expect(result.galleryType).toBe("gallery");
            expect(result.sourceSystem).toBe("api-importer");
            expect(result.sourceUri).toBe("https://cdn.example.com/image.jpg");
        });

        it("maps crops array", () => {
            const result = mapMedia(apiMedia);
            expect(result.crops).toHaveLength(1);
            expect(result.crops[0].cropName).toBe("hd_ready");
        });

        it("handles empty crops array", () => {
            const result = mapMedia({ ...apiMedia, crops: [] });
            expect(result.crops).toHaveLength(0);
        });

        it("normalizes missing optional fields to null", () => {
            const result = mapMedia({
                ...apiMedia,
                url: undefined,
                file_size: undefined,
                width: undefined,
                height: undefined,
                checksum: undefined,
                parent_id: undefined,
                derivative_type: undefined,
                gallery_type: undefined,
            });
            expect(result.url).toBeNull();
            expect(result.fileSize).toBeNull();
            expect(result.width).toBeNull();
            expect(result.height).toBeNull();
            expect(result.parentId).toBeNull();
            expect(result.galleryType).toBeNull();
        });
    });

    describe("mapMediaList", () => {
        it("maps an array of media payloads", () => {
            const result = mapMediaList([apiMedia, { ...apiMedia, id: "m-2" }]);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("m-1");
            expect(result[1].id).toBe("m-2");
        });

        it("returns empty array for empty input", () => {
            expect(mapMediaList([])).toEqual([]);
        });
    });

    describe("mapAttachMediaInput", () => {
        it("maps camelCase input to snake_case API payload", () => {
            const result = mapAttachMediaInput({
                s3Key: "media/test.jpg",
                mimeType: "image/jpeg",
                role: "gallery",
                sortOrder: 1,
                isCoverImage: true,
                altTextNl: "Alt NL",
                altTextEn: "Alt EN",
                width: 800,
                height: 600,
                fileSize: 50000,
            });
            expect(result.s3_key).toBe("media/test.jpg");
            expect(result.mime_type).toBe("image/jpeg");
            expect(result.role).toBe("gallery");
            expect(result.sort_order).toBe(1);
            expect(result.is_cover_image).toBe(true);
            expect(result.alt_text_nl).toBe("Alt NL");
            expect(result.alt_text_en).toBe("Alt EN");
            expect(result.width).toBe(800);
            expect(result.height).toBe(600);
            expect(result.file_size).toBe(50000);
        });
    });

    describe("mapUploadUrlInput", () => {
        it("maps filename and mimeType", () => {
            const result = mapUploadUrlInput({
                filename: "photo.jpg",
                mimeType: "image/jpeg",
            });
            expect(result.filename).toBe("photo.jpg");
            expect(result.mime_type).toBe("image/jpeg");
        });
    });

    describe("mapUploadUrlResult", () => {
        it("maps API response to camelCase", () => {
            const result = mapUploadUrlResult({
                s3_key: "media/abc.jpg",
                upload_url: "https://s3.example.com/presigned",
                expires_in: 300,
            });
            expect(result.s3Key).toBe("media/abc.jpg");
            expect(result.uploadUrl).toBe("https://s3.example.com/presigned");
            expect(result.expiresIn).toBe(300);
        });
    });
});
