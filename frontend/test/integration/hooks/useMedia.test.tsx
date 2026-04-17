import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import {
    useGetAllMedia,
    useGetEntityMedia,
    useGetInfiniteMedia,
    useGetMedia,
    useSearchMedia,
    useAttachMedia,
    useUnlinkMedia,
    useSetCoverMedia,
    useClearCoverMedia,
    useUpdateMedia,
    useDeleteMedia,
    useGenerateUploadUrl,
} from "@/hooks/api/useMedia";
import type { components } from "@/types/api/generated";
import type { AttachMediaInput, Media, UploadUrlInput } from "@/types/models/media.types";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";

// ── Shared typed fixtures ───────────────────────────────────────────

const mediaFixture: components["schemas"]["MediaPayload"] = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    url: "https://s3.example.com/media/test.jpg",
    s3_key: "media/test.jpg",
    mime_type: "image/jpeg",
    file_size: 120000,
    width: 1920,
    height: 1080,
    checksum: "sha256-abc",
    alt_text_nl: "Testafbeelding",
    alt_text_en: "Test image",
    alt_text_fr: null,
    description_nl: "Een testbeschrijving",
    description_en: null,
    description_fr: null,
    credit_nl: "Fotograaf",
    credit_en: null,
    credit_fr: null,
    geo_latitude: null,
    geo_longitude: null,
    parent_id: null,
    derivative_type: null,
    gallery_type: "gallery",
    source_system: "cms",
    source_uri: null,
    crops: [],
};

// ── Query hook tests ────────────────────────────────────────────────

describe("useGetAllMedia", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetAllMedia(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data).toHaveLength(1);

        const media = result.current.data?.data[0];
        expect(media).toHaveProperty("id");
        expect(media?.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        expect(media?.mimeType).toBe("image/jpeg");
        expect(media?.altTextNl).toBe("Testafbeelding");
        expect(media?.altTextEn).toBe("Test image");
        expect(media?.galleryType).toBe("gallery");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetAllMedia(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.media.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetAllMedia(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.media.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetAllMedia(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetMedia", () => {
    it("fetches a single media item by id (non-paginated)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetMedia("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        expect(result.current.data?.mimeType).toBe("image/jpeg");
    });
});

describe("useSearchMedia", () => {
    it("returns matching results when query matches", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useSearchMedia({ q: "test" }), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0].altTextNl).toBe("Testafbeelding");
    });

    it("returns empty results when query does not match", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useSearchMedia({ q: "nonexistent-xyz" }), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.data).toHaveLength(0);
        expect(result.current.data?.nextCursor).toBeNull();
    });

    it("uses different cache keys for different search params", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useSearchMedia({ q: "test" }), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const second = renderHook(() => useSearchMedia({ q: "nonexistent-xyz" }), { wrapper });

        await waitFor(() => {
            expect(second.result.current.isSuccess).toBe(true);
        });

        const cache1 = queryClient.getQueryData(queryKeys.media.all({ q: "test" }));
        const cache2 = queryClient.getQueryData(queryKeys.media.all({ q: "nonexistent-xyz" }));
        expect(cache1).not.toEqual(cache2);
    });
});

describe("useGetInfiniteMedia", () => {
    it("maps first page to data.pages[0] and hasNextPage is false when next_cursor is null", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetInfiniteMedia(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.pages).toHaveLength(1);
        const firstPage = result.current.data?.pages[0];
        expect(firstPage?.data).toHaveLength(1);
        expect(firstPage?.data[0].id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        expect(firstPage?.data[0].mimeType).toBe("image/jpeg");
        expect(firstPage?.nextCursor).toBeNull();
        expect(result.current.hasNextPage).toBe(false);
    });

    it("accumulates pages when fetchNextPage is called and next_cursor is present", async () => {
        const pageOneItem: components["schemas"]["MediaPayload"] = {
            ...mediaFixture,
            url: "https://s3.example.com/media/page1.jpg",
            alt_text_nl: "Pagina 1",
            alt_text_en: "Page 1",
        };

        const pageTwoItem: components["schemas"]["MediaPayload"] = {
            ...mediaFixture,
            id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            url: "https://s3.example.com/media/page2.jpg",
            alt_text_nl: "Pagina 2",
            alt_text_en: "Page 2",
        };

        server.use(
            http.get(apiUrl("/media"), ({ request }) => {
                const cursor = new URL(request.url).searchParams.get("cursor");

                if (cursor === "cursor-page-2") {
                    return HttpResponse.json({
                        data: [pageTwoItem],
                        next_cursor: null,
                    } satisfies components["schemas"]["PaginatedResponse_MediaPayload"]);
                }

                return HttpResponse.json({
                    data: [pageOneItem],
                    next_cursor: "cursor-page-2",
                } satisfies components["schemas"]["PaginatedResponse_MediaPayload"]);
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetInfiniteMedia(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.hasNextPage).toBe(true);
        expect(result.current.data?.pages).toHaveLength(1);

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() => {
            expect(result.current.data?.pages).toHaveLength(2);
        });

        expect(result.current.hasNextPage).toBe(false);

        const allItems = result.current.data?.pages.flatMap((p) => p.data);
        expect(allItems).toHaveLength(2);
        expect(allItems?.[0].id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        expect(allItems?.[1].id).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    });

    it("uses different cache keys for different params", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetInfiniteMedia({ q: "test" }), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const second = renderHook(() => useGetInfiniteMedia({ q: "nonexistent-xyz" }), { wrapper });

        await waitFor(() => {
            expect(second.result.current.isSuccess).toBe(true);
        });

        const cache1 = queryClient.getQueryData(queryKeys.media.infinite({ q: "test" }));
        const cache2 = queryClient.getQueryData(queryKeys.media.infinite({ q: "nonexistent-xyz" }));
        expect(cache1).not.toEqual(cache2);
    });

    it("uses a separate cache key from useGetAllMedia", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetInfiniteMedia(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const infiniteCache = queryClient.getQueryData(queryKeys.media.infinite());
        const allCache = queryClient.getQueryData(queryKeys.media.all());
        expect(infiniteCache).not.toBeUndefined();
        expect(allCache).toBeUndefined();
    });
});

describe("useGetEntityMedia", () => {
    it("fetches media for a given entity type and id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEntityMedia("production", "prod-1"), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        expect(result.current.data?.[0].mimeType).toBe("image/jpeg");
    });

    it("is disabled when entityId is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEntityMedia("production", ""), { wrapper });

        expect(result.current.isFetching).toBe(false);
    });
});

// ── Mutation hook tests ─────────────────────────────────────────────

describe("useGenerateUploadUrl", () => {
    it("returns a presigned URL with s3Key", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGenerateUploadUrl(), { wrapper });

        const input: UploadUrlInput = {
            filename: "photo.jpg",
            mimeType: "image/jpeg",
        };

        await act(async () => {
            await result.current.mutateAsync(input);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.s3Key).toBe("media/generated-key.jpg");
        expect(result.current.data?.uploadUrl).toBe("https://s3.example.com/presigned-put-url");
        expect(result.current.data?.expiresIn).toBe(300);
    });
});

describe("useAttachMedia", () => {
    it("invalidates entity media and all media caches on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useAttachMedia(), { wrapper });

        const input: AttachMediaInput = {
            s3Key: "media/test.jpg",
            uploadToken: "test-upload-token",
            mimeType: "image/jpeg",
        };

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "production",
                entityId: "prod-1",
                input,
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("cccccccc-cccc-cccc-cccc-cccccccccccc");
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.media.entity("production", "prod-1"),
        });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.media.all() });
    });
});

describe("useUnlinkMedia", () => {
    it("invalidates entity media cache on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useUnlinkMedia(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "production",
                entityId: "prod-1",
                mediaId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.media.entity("production", "prod-1"),
        });
    });
});

describe("useSetCoverMedia", () => {
    it("invalidates entity media cache on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useSetCoverMedia(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "production",
                entityId: "prod-1",
                mediaId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.media.entity("production", "prod-1"),
        });
    });
});

describe("useClearCoverMedia", () => {
    it("invalidates entity media cache on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useClearCoverMedia(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "production",
                entityId: "prod-1",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.media.entity("production", "prod-1"),
        });
    });
});

describe("useUpdateMedia", () => {
    it("updates detail cache and invalidates list on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const setSpy = vi.spyOn(queryClient, "setQueryData");
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useUpdateMedia(), { wrapper });

        const mediaInput: Media = {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z",
            url: "https://s3.example.com/media/test.jpg",
            s3Key: "media/test.jpg",
            mimeType: "image/jpeg",
            fileSize: 120000,
            width: 1920,
            height: 1080,
            checksum: "sha256-abc",
            altTextNl: "Updated alt",
            altTextEn: "Updated alt EN",
            altTextFr: null,
            descriptionNl: null,
            descriptionEn: null,
            descriptionFr: null,
            creditNl: null,
            creditEn: null,
            creditFr: null,
            geoLatitude: null,
            geoLongitude: null,
            parentId: null,
            derivativeType: null,
            galleryType: "gallery",
            sourceSystem: "cms",
            sourceUri: null,
            crops: [],
        };

        await act(async () => {
            await result.current.mutateAsync(mediaInput);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(setSpy).toHaveBeenCalledWith(
            queryKeys.media.detail("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            expect.objectContaining({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.media.all() });
    });
});

describe("useDeleteMedia", () => {
    it("removes detail cache and invalidates list on delete", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const removeSpy = vi.spyOn(queryClient, "removeQueries");
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useDeleteMedia(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(removeSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.media.detail("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.media.all() });
    });
});
