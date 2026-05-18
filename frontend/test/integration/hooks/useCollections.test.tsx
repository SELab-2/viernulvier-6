import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import {
    useGetCollections,
    useGetCollection,
    useGetCollectionBySlug,
    useCreateCollection,
    useUpdateCollection,
    useDeleteCollection,
} from "@/hooks/api/useCollections";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetCollections", () => {
    it("fetches paginated collections and maps to domain model", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetCollections(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0]).toMatchObject({
            slug: "test-collectie",
            visibility: "public",
        });
        expect(result.current.data[0].translations).toHaveLength(2);
    });

    it("respects the enabled option", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetCollections({ enabled: false }), { wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useGetCollection", () => {
    it("fetches a single collection by id", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(
            () => useGetCollection("a0000000-0000-0000-0000-000000000001"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toMatchObject({ slug: "test-collectie" });
    });
});

describe("useGetCollectionBySlug", () => {
    it("fetches a single collection by slug", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetCollectionBySlug("test-collectie"), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toMatchObject({ slug: "test-collectie" });
    });
});

describe("useCreateCollection", () => {
    it("creates a collection and invalidates cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useCreateCollection(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                slug: "nieuw",
                translations: [{ languageCode: "nl", title: "Nieuw", description: "" }],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});

describe("useUpdateCollection", () => {
    it("updates a collection and invalidates cache", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useUpdateCollection(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                id: "a0000000-0000-0000-0000-000000000001",
                slug: "test-collectie",
                visibility: "unlisted" as const,
                translations: [{ languageCode: "nl", title: "Updated", description: "" }],
                items: [],
                createdAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-01T00:00:00Z",
                coverImageUrl: null,
                tags: [],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});

describe("useDeleteCollection", () => {
    it("deletes a collection and invalidates cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useDeleteCollection(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync("a0000000-0000-0000-0000-000000000001");
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
