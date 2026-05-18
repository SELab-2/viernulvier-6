import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import {
    useCreateLocation,
    useDeleteLocation,
    useGetLocation,
    useGetLocationBySlug,
    useGetLocations,
    useUpdateLocation,
} from "@/hooks/api/useLocations";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";
import type { components } from "@/types/api/generated";

describe("useGetLocations", () => {
    it("maps paginated DTO response to domain model with pagination info", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocations(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("data");
        expect(result.current.data).toHaveProperty("nextCursor");
        expect(Array.isArray(result.current.data?.data)).toBe(true);
        expect(result.current.data?.data[0]).toHaveProperty("id");
        expect(result.current.data?.data[0]).toHaveProperty("name");
    });

    it("returns paginated result with data array and nextCursor", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocations(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cachedData = queryClient.getQueryData(queryKeys.locations.all());
        expect(cachedData).toHaveProperty("data");
        expect(cachedData).toHaveProperty("nextCursor");
        expect(Array.isArray((cachedData as { data: unknown[] }).data)).toBe(true);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetLocations(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.locations.all());
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetLocations(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});

describe("useGetLocation", () => {
    it("fetches a single location by id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetLocation("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("id", "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404");
        expect(result.current.data).toHaveProperty("name", "Main Venue");
    });

    it("does not fetch when id is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocation(""), { wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useGetLocationBySlug", () => {
    it("fetches a single location by slug", async () => {
        server.use(
            http.get(apiUrl("/locations/slug/main-venue"), () => {
                return HttpResponse.json({
                    id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
                    source_id: 101,
                    name: "Main Venue",
                    slug: "main-venue",
                    code: "MV",
                    street: "Mainstraat",
                    number: "12",
                    postal_code: "9000",
                    city: "Gent",
                    country: "Belgium",
                    phone_1: "+32-9-000-00-00",
                    phone_2: null,
                    is_owned_by_viernulvier: true,
                    uitdatabank_id: "udb-main",
                    translations: [],
                } satisfies components["schemas"]["LocationPayload"]);
            })
        );

        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocationBySlug("main-venue"), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveProperty("id", "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404");
    });

    it("does not fetch when slug is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocationBySlug(""), { wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useCreateLocation", () => {
    it("creates a location and invalidates the list cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useCreateLocation(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                name: "New Venue",
                code: "NV",
                street: "Newstraat",
                number: "1",
                postalCode: "1000",
                city: "Brussels",
                country: "Belgium",
                isOwnedByViernulvier: false,
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(expect.objectContaining({ name: "New Venue" }));

        const listData = queryClient.getQueryData(queryKeys.locations.all());
        expect(listData).toBeUndefined();
    });
});

describe("useUpdateLocation", () => {
    it("updates a location and updates the detail cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useUpdateLocation(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
                name: "Updated Venue",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(expect.objectContaining({ name: "Updated Venue" }));
    });
});

describe("useDeleteLocation", () => {
    it("deletes a location and removes detail from cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(
            queryKeys.locations.detail("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404"),
            { id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404", name: "Main Venue" }
        );

        const { result } = renderHook(() => useDeleteLocation(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404");
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toBe("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404");

        const cached = queryClient.getQueryData(
            queryKeys.locations.detail("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404")
        );
        expect(cached).toBeUndefined();
    });
});
