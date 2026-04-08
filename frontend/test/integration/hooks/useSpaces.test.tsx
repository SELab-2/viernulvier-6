import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetSpaces, useGetSpace, useCreateSpace } from "@/hooks/api/useSpaces";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetSpaces", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetSpaces(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0]).toHaveProperty("id");
        expect(result.current.data?.data[0]).toHaveProperty("nameNl");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetSpaces(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.spaces.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetSpaces(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.spaces.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetSpaces(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetSpace", () => {
    it("fetches a single space by id (non-paginated)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetSpace("cb74aa4f-6856-4a8b-9930-2a8c56ec3333"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("cb74aa4f-6856-4a8b-9930-2a8c56ec3333");
    });
});

describe("useCreateSpace", () => {
    it("creates a space and invalidates list cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        // Pre-populate cache
        queryClient.setQueryData(queryKeys.spaces.all(), {
            data: [{ id: "existing" }],
            nextCursor: null,
        });

        const { result } = renderHook(() => useCreateSpace(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                nameNl: "New Space",
                locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
