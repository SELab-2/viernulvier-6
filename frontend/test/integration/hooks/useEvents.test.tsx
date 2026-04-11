import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetEvents, useGetEvent, useGetEventsByProduction } from "@/hooks/api/useEvents";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetEvents", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEvents(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data[0]).toHaveProperty("id");
        expect(result.current.data?.data[0]).toHaveProperty("status");
        expect(result.current.data?.data[0]).toHaveProperty("prices");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEvents(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.events.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetEvents(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.events.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetEvents(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });

    describe("pagination", () => {
        it("fetches first page by default and returns nextCursor", async () => {
            const { wrapper } = createQueryClientWrapper();

            const { result } = renderHook(() => useGetEvents(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data?.data).toHaveLength(1);
            expect(result.current.data?.data[0].id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            expect(result.current.data?.nextCursor).toBe("page2");
        });

        it("fetches next page when cursor is provided", async () => {
            const { wrapper } = createQueryClientWrapper();

            const { result } = renderHook(() => useGetEvents({ pagination: { cursor: "page2" } }), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data?.data).toHaveLength(1);
            expect(result.current.data?.data[0].id).toBe("b2c3d4e5-f6g7-8901-bcde-f12345678901");
            expect(result.current.data?.nextCursor).toBeNull();
        });

        it("respects limit parameter", async () => {
            const { wrapper } = createQueryClientWrapper();

            const { result } = renderHook(() => useGetEvents({ pagination: { limit: 1 } }), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            // The mock returns 1 item per page by default
            expect(result.current.data?.data).toHaveLength(1);
        });

        it("combines cursor and limit parameters", async () => {
            const { wrapper } = createQueryClientWrapper();

            const { result } = renderHook(
                () => useGetEvents({ pagination: { cursor: "page2", limit: 5 } }),
                { wrapper }
            );

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data?.data[0].id).toBe("b2c3d4e5-f6g7-8901-bcde-f12345678901");
        });

        it("caches paginated queries separately based on pagination params", async () => {
            const { wrapper } = createQueryClientWrapper();

            // First page
            const firstPage = renderHook(() => useGetEvents(), { wrapper });

            await waitFor(() => {
                expect(firstPage.result.current.isSuccess).toBe(true);
            });

            // Second page with cursor
            const secondPage = renderHook(() => useGetEvents({ pagination: { cursor: "page2" } }), {
                wrapper,
            });

            await waitFor(() => {
                expect(secondPage.result.current.isSuccess).toBe(true);
            });

            // They should have different cached data
            expect(firstPage.result.current.data?.data[0].id).not.toBe(
                secondPage.result.current.data?.data[0].id
            );
        });
    });
});

describe("useGetEvent", () => {
    it("fetches a single event by id (non-paginated)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEvent("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        expect(result.current.data?.status).toBe("available");
    });
});

describe("useGetEventsByProduction", () => {
    it("fetches events for a specific production (non-paginated array)", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetEventsByProduction("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data![0].productionId).toBe("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");
    });

    it("caches production events under production query key", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetEventsByProduction("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(
            queryKeys.productions.events("4f327f95-3a64-4fc0-8f6a-a9dc44c01111")
        );
        expect(cached).toEqual(result.current.data);
    });
});
