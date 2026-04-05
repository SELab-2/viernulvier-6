import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import {
    useGetProductions,
    useGetProduction,
    useCreateProduction,
} from "@/hooks/api/useProductions";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetProductions", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetProductions(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0]).toHaveProperty("id");
        expect(result.current.data?.data[0]).toHaveProperty("slug");
        expect(result.current.data?.data[0]).toHaveProperty("translations");
        expect(Array.isArray(result.current.data?.data[0].translations)).toBe(true);
        expect(result.current.data?.data[0].translations.length).toBeGreaterThan(0);
        const nlTranslation = result.current.data?.data[0].translations.find(
            (t) => t.languageCode === "nl"
        );
        expect(nlTranslation?.title).toBe("Productie NL");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetProductions(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.productions.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetProductions(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.productions.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetProductions(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetProduction", () => {
    it("fetches a single production by id (non-paginated)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetProduction("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");
    });
});

describe("useCreateProduction", () => {
    it("creates a production and invalidates list cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        // Pre-populate cache
        queryClient.setQueryData(queryKeys.productions.all(), {
            data: [{ id: "existing" }],
            nextCursor: null,
        });

        const { result } = renderHook(() => useCreateProduction(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                slug: "new-production",
                translations: [{ languageCode: "nl", title: "Nieuwe Productie" }],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
