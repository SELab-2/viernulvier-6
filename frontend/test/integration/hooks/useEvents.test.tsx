import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetEvents, useGetEvent, useGetEventsByProduction } from "@/hooks/api/useEvents";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetEvents", () => {
    it("maps DTO response to domain model", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetEvents(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([
            {
                id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                sourceId: 42,
                createdAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-01T00:00:00Z",
                startsAt: "2025-06-15T20:00:00Z",
                endsAt: "2025-06-15T22:00:00Z",
                intermissionAt: null,
                doorsAt: "2025-06-15T19:00:00Z",
                vendorId: null,
                boxOfficeId: null,
                uitdatabankId: null,
                maxTicketsPerOrder: 10,
                productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
                status: "available",
                hallId: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
            },
        ]);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetEvents(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.events.all);
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetEvents(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetEvent", () => {
    it("fetches a single event by id", async () => {
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
    it("fetches events for a specific production", async () => {
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
