import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useCreateLocation, useDeleteLocation, useUpdateLocation } from "@/hooks/api/useLocations";
import { useCreateProduction, useUpdateProduction } from "@/hooks/api/useProductions";
import { useCreateHall, useUpdateHall } from "@/hooks/api/useHalls";
import { useCreateSpace, useUpdateSpace } from "@/hooks/api/useSpaces";
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/api/useEvents";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("resource mutation caching behavior", () => {
    it("invalidates locations list on create", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useCreateLocation(), { wrapper });

        result.current.mutate({ name: "Created" });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.all() });
    });

    it("updates detail cache on location update", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const setSpy = vi.spyOn(queryClient, "setQueryData");
        const { result } = renderHook(() => useUpdateLocation(), { wrapper });

        result.current.mutate({
            id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            name: "Updated",
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(setSpy).toHaveBeenCalledWith(
            queryKeys.locations.detail("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404"),
            expect.objectContaining({ id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404" })
        );
    });

    it("removes location detail cache on delete", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const removeSpy = vi.spyOn(queryClient, "removeQueries");
        const { result } = renderHook(() => useDeleteLocation(), { wrapper });

        result.current.mutate("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404");

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(removeSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.locations.detail("67c95f6a-8bb8-43d6-a4bc-f7e18b86f404"),
        });
    });

    it("invalidates events list on create", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useCreateEvent(), { wrapper });

        result.current.mutate({
            startsAt: "2025-06-15T20:00:00Z",
            productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            status: "available",
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.events.all() });
    });

    it("updates detail cache on event update", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const setSpy = vi.spyOn(queryClient, "setQueryData");
        const { result } = renderHook(() => useUpdateEvent(), { wrapper });

        result.current.mutate({
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            startsAt: "2025-06-15T20:00:00Z",
            productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            status: "available",
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(setSpy).toHaveBeenCalledWith(
            queryKeys.events.detail("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
            expect.objectContaining({ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
        );
    });

    it("removes event detail cache on delete", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const removeSpy = vi.spyOn(queryClient, "removeQueries");
        const { result } = renderHook(() => useDeleteEvent(), { wrapper });

        result.current.mutate("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(removeSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.events.detail("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
        });
    });

    it("applies same mutation invalidation pattern for other resources", async () => {
        const { wrapper } = createQueryClientWrapper();

        const createProduction = renderHook(() => useCreateProduction(), { wrapper });
        createProduction.result.current.mutate({ slug: "production" });

        const updateHall = renderHook(() => useUpdateHall(), { wrapper });
        updateHall.result.current.mutate({
            id: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
            slug: "big-hall",
            name: "Hall",
        });

        const createHall = renderHook(() => useCreateHall(), { wrapper });
        createHall.result.current.mutate({ slug: "h", name: "Hall" });

        const createSpace = renderHook(() => useCreateSpace(), { wrapper });
        createSpace.result.current.mutate({
            nameNl: "Space",
            locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
        });

        const updateProduction = renderHook(() => useUpdateProduction(), { wrapper });
        updateProduction.result.current.mutate({
            id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            slug: "production",
        });

        const updateSpace = renderHook(() => useUpdateSpace(), { wrapper });
        updateSpace.result.current.mutate({
            id: "cb74aa4f-6856-4a8b-9930-2a8c56ec3333",
            nameNl: "Space",
            locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
        });

        await waitFor(() => {
            expect(createProduction.result.current.isSuccess).toBe(true);
            expect(updateHall.result.current.isSuccess).toBe(true);
            expect(createHall.result.current.isSuccess).toBe(true);
            expect(createSpace.result.current.isSuccess).toBe(true);
            expect(updateProduction.result.current.isSuccess).toBe(true);
            expect(updateSpace.result.current.isSuccess).toBe(true);
        });
    });
});
