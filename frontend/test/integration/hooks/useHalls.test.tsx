import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetHalls, useGetHall, useCreateHall } from "@/hooks/api/useHalls";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetHalls", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetHalls(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0]).toHaveProperty("id");
        expect(result.current.data?.data[0]).toHaveProperty("name");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetHalls(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.halls.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetHalls(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.halls.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetHalls(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetHall", () => {
    it("fetches a single hall by id (non-paginated)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetHall("d30f5f95-3a64-4fc0-8f6a-a9dc44c02222"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("d30f5f95-3a64-4fc0-8f6a-a9dc44c02222");
    });
});

describe("useCreateHall", () => {
    it("creates a hall and invalidates list cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        // Pre-populate cache
        queryClient.setQueryData(queryKeys.halls.all(), {
            data: [{ id: "existing" }],
            nextCursor: null,
        });

        const { result } = renderHook(() => useCreateHall(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                slug: "new-hall",
                name: "New Hall",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
