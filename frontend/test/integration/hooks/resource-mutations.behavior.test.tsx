import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/api/useEvents";
import {
    useCreateProduction,
    useUpdateProduction,
    useDeleteProduction,
} from "@/hooks/api/useProductions";
import { queryKeys } from "@/hooks/api/query-keys";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("Resource mutation hooks", () => {
    describe("useCreateEvent", () => {
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
    });

    describe("useUpdateEvent", () => {
        it("updates detail cache on event update", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const setSpy = vi.spyOn(queryClient, "setQueryData");
            const { result } = renderHook(() => useUpdateEvent(), { wrapper });

            result.current.mutate({
                id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                startsAt: "2025-06-15T20:00:00Z",
                productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
                status: "available",
                createdAt: "2025-01-01T00:00:00Z",
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(setSpy).toHaveBeenCalledWith(
                queryKeys.events.detail("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                expect.objectContaining({ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
            );
        });

        it("invalidates production events on update", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
            const { result } = renderHook(() => useUpdateEvent(), { wrapper });

            result.current.mutate({
                id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                startsAt: "2025-06-15T20:00:00Z",
                productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
                status: "available",
                createdAt: "2025-01-01T00:00:00Z",
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: queryKeys.productions.events("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            });
        });
    });

    describe("useDeleteEvent", () => {
        it("removes detail cache and invalidates list on delete", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const removeSpy = vi.spyOn(queryClient, "removeQueries");
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
            const { result } = renderHook(() => useDeleteEvent(), { wrapper });

            result.current.mutate("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(removeSpy).toHaveBeenCalledWith({
                queryKey: queryKeys.events.detail("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
            });
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.events.all() });
        });
    });

    describe("useCreateProduction", () => {
        it("invalidates productions list on create", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
            const { result } = renderHook(() => useCreateProduction(), { wrapper });

            result.current.mutate({
                slug: "test-production-123",
                translations: [
                    { languageCode: "en", title: "Test Production" },
                    { languageCode: "nl", title: "Test Productie" },
                ],
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productions.all() });
        });
    });

    describe("useUpdateProduction", () => {
        it("updates detail cache on production update", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const setSpy = vi.spyOn(queryClient, "setQueryData");
            const { result } = renderHook(() => useUpdateProduction(), { wrapper });

            result.current.mutate({
                id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
                slug: "test-production-123",
                translations: [{ languageCode: "en", title: "Updated Title" }],
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(setSpy).toHaveBeenCalledWith(
                queryKeys.productions.detail("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
                expect.objectContaining({ id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111" })
            );
        });
    });

    describe("useDeleteProduction", () => {
        it("removes detail cache and invalidates list on delete", async () => {
            const { wrapper, queryClient } = createQueryClientWrapper();
            const removeSpy = vi.spyOn(queryClient, "removeQueries");
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
            const { result } = renderHook(() => useDeleteProduction(), { wrapper });

            result.current.mutate("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(removeSpy).toHaveBeenCalledWith({
                queryKey: queryKeys.productions.detail("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            });
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productions.all() });
        });
    });
});
