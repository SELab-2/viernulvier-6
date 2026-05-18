import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGetEntityTags, useReplaceEntityTags } from "@/hooks/api/useEntityTags";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetEntityTags", () => {
    it("fetches facets with nested tags for an entity", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetEntityTags("production", "test-prod-id"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        const facet = result.current.data![0];
        expect(facet.slug).toBe("discipline");
        expect(facet.tags).toHaveLength(2);
        expect(facet.tags[0]).toMatchObject({
            slug: "theater",
            inherited: false,
        });
    });
});

describe("useReplaceEntityTags", () => {
    it("replaces tags for an entity and returns updated facets", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useReplaceEntityTags(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "production",
                entityId: "test-prod-id",
                tagSlugs: ["theater", "dans", "muziek"],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data![0].tags).toHaveLength(3);
        expect(result.current.data![0].tags[2].slug).toBe("muziek");
    });
});
