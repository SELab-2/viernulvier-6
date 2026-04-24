import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetArtist, useGetArtists, useGetProductionsByArtist } from "@/hooks/api/useArtists";
import { createQueryClientWrapper } from "../../utils/query-client";

const artistId = "1c4d1d7b-3a5e-4b68-b763-9cf92f43d001";

describe("useGetArtists", () => {
    it("fetches and maps artists from the generated endpoint types", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArtists(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0]).toEqual({
            coverImageUrl: null,
            id: artistId,
            slug: "test-artist",
            name: "Test Artist",
        });
    });

    it("caches artist lists under the artists list key", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArtists(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(queryClient.getQueryData(queryKeys.artists.all)).toEqual(result.current.data);
    });
});

describe("useGetArtist", () => {
    it("fetches a single artist by id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArtist(artistId), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual({
            coverImageUrl: null,
            id: artistId,
            slug: "test-artist",
            name: "Test Artist",
        });
    });

    it("does not fetch when the artist id is empty", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArtist(""), { wrapper });

        expect(result.current.fetchStatus).toBe("idle");
        expect(result.current.isPending).toBe(true);
    });
});

describe("useGetProductionsByArtist", () => {
    it("fetches productions for a specific artist", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetProductionsByArtist(artistId), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].id).toBe("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");
        expect(result.current.data?.[0].translations[0]?.artist).toBe("Test Artist");
    });

    it("caches artist productions under the artist productions key", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetProductionsByArtist(artistId), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(queryClient.getQueryData(queryKeys.artists.productions(artistId))).toEqual(
            result.current.data
        );
    });
});
