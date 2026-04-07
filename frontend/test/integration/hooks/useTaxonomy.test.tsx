import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetFacets", () => {
    it("maps DTO response to domain model", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetFacets(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0]).toEqual({
            slug: "discipline",
            translations: [
                { languageCode: "nl", label: "Discipline" },
                { languageCode: "en", label: "Discipline" },
            ],
            tags: [
                {
                    slug: "theatre",
                    sortOrder: 1,
                    translations: [
                        { languageCode: "nl", label: "Theater", description: null },
                        { languageCode: "en", label: "Theatre", description: null },
                    ],
                },
                {
                    slug: "music",
                    sortOrder: 2,
                    translations: [
                        { languageCode: "nl", label: "Muziek", description: null },
                        { languageCode: "en", label: "Music", description: null },
                    ],
                },
            ],
        });
    });

    it("accepts entityType filter parameter", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetFacets({ entityType: "production" }), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
    });

    it("uses different query keys for filtered vs unfiltered", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const unfiltered = renderHook(() => useGetFacets(), { wrapper });

        await waitFor(() => {
            expect(unfiltered.result.current.isSuccess).toBe(true);
        });

        expect(queryClient.getQueryData(queryKeys.taxonomy.facets())).toEqual(
            unfiltered.result.current.data
        );

        const filtered = renderHook(() => useGetFacets({ entityType: "production" }), { wrapper });

        await waitFor(() => {
            expect(filtered.result.current.isSuccess).toBe(true);
        });

        expect(queryClient.getQueryData(queryKeys.taxonomy.facets("production"))).toEqual(
            filtered.result.current.data
        );
    });
});
