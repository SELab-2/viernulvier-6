import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetAllMedia, useGetMedia, useSearchMedia } from "@/hooks/api/useMedia";
import { createQueryClientWrapper } from "../../utils/query-client";

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
