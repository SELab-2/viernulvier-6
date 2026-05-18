import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetStats } from "@/hooks/api/useStats";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetStats", () => {
    it("fetches archive statistics", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetStats(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toMatchObject({
            article_count: 12,
            event_count: 156,
            location_count: 8,
            artist_count: 24,
        });
    });

    it("caches the response under the stats query key", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetStats(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.stats);
        expect(cached).toEqual(result.current.data);
    });
});
