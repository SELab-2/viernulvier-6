import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetFacets, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/api/useTaxonomy";
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

describe("useCreateTag", () => {
    it("calls POST and returns mapped tag on success", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useCreateTag(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                facet: "discipline",
                translations: [
                    { language_code: "nl", label: "Nieuwe Tag" },
                    { language_code: "en", label: "New Tag" },
                ],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data?.slug).toBe("new-tag");
    });
});

describe("useUpdateTag", () => {
    it("calls PATCH and resolves on 204", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useUpdateTag(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                slug: "theatre",
                translations: [
                    { language_code: "nl", label: "Theater Nieuw" },
                    { language_code: "en", label: "Theatre New" },
                ],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});

describe("useDeleteTag", () => {
    it("returns usage_count when tag is in use and force is false", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useDeleteTag(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ slug: "theatre", force: false });
        });

        await waitFor(() => {
            expect(result.current.data?.usage_count).toBe(3);
        });
    });

    it("resolves with no usage_count when force is true", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useDeleteTag(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ slug: "theatre", force: true });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data?.usage_count).toBeUndefined();
    });
});
