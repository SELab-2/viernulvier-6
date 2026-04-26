import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGetImportErrors } from "@/hooks/api/useImportErrors";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetImportErrors", () => {
    it("fetches unresolved import errors by default", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetImportErrors(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0]).toMatchObject({
            entity: "media",
            source_id: 404,
            error_kind: "missing_required_field",
        });
        expect(result.current.data?.nextCursor).toBe("page2");

        const cached = queryClient.getQueryData(queryKeys.importErrors.all(undefined, undefined));
        expect(cached).toEqual(result.current.data);
    });

    it("passes pagination params and maps next_cursor to nextCursor", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetImportErrors({ pagination: { cursor: "page2", limit: 10 } }),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data?.data[0].entity).toBe("media_variant");
        expect(result.current.data?.nextCursor).toBeNull();
    });

    it("fetches resolved import errors under a separate query key", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetImportErrors({ resolved: true }), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.data[0]).toMatchObject({
            entity: "event",
            resolved_at: "2026-04-01T11:00:00Z",
        });

        const unresolvedCache = queryClient.getQueryData(
            queryKeys.importErrors.all(undefined, false)
        );
        const resolvedCache = queryClient.getQueryData(queryKeys.importErrors.all(undefined, true));

        expect(unresolvedCache).toBeUndefined();
        expect(resolvedCache).toEqual(result.current.data);
    });
});
