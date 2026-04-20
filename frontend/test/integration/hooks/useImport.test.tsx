import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";
import {
    useCancelSession,
    useImportSession,
    useImportSessions,
    useImportRows,
    useStartDryRun,
    useUpdateMapping,
} from "@/hooks/api/useImport";
import { createQueryClientWrapper } from "../../utils/query-client";

const SESSION_ID = "session-uuid-1";
const ROW_ID = "row-uuid-1";

describe("useImportSessions", () => {
    it("fetches and maps a list of sessions", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useImportSessions(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(Array.isArray(result.current.data)).toBe(true);
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0]).toMatchObject({
            id: SESSION_ID,
            entityType: "production",
            filename: "data.csv",
            status: "mapping",
        });
    });

    it("caches result in query client", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useImportSessions(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.imports.sessions());
        expect(cached).toEqual(result.current.data);
    });
});

describe("useImportSession", () => {
    it("fetches a single session by id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useImportSession(SESSION_ID), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.id).toBe(SESSION_ID);
        expect(result.current.data?.entityType).toBe("production");
        expect(result.current.data?.mapping.columns).toEqual({ name: null, date: null });
    });

    it("is disabled when id is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useImportSession(""), { wrapper });

        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useImportRows", () => {
    it("fetches rows for a session", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useImportRows(SESSION_ID), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(Array.isArray(result.current.data)).toBe(true);
        expect(result.current.data?.[0]).toMatchObject({
            id: ROW_ID,
            sessionId: SESSION_ID,
            rowNumber: 1,
            status: "pending",
        });
    });
});

describe("useStartDryRun", () => {
    it("posts to dry-run and returns updated session with pending status", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useStartDryRun(), { wrapper });

        let session;
        await act(async () => {
            session = await result.current.mutateAsync(SESSION_ID);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(session).toMatchObject({
            id: SESSION_ID,
            status: "dry_run_pending",
        });
    });

    it("invalidates session cache after dry-run", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        // Pre-populate cache
        queryClient.setQueryData(queryKeys.imports.session(SESSION_ID), {
            id: SESSION_ID,
            status: "mapping",
        });

        const { result } = renderHook(() => useStartDryRun(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync(SESSION_ID);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        // Cache should be invalidated (stale), not holding old data
        const state = queryClient.getQueryState(queryKeys.imports.session(SESSION_ID));
        expect(state?.isInvalidated).toBe(true);
    });
});

describe("useUpdateMapping", () => {
    it("patches mapping and returns updated session", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useUpdateMapping(), { wrapper });

        let updated;
        await act(async () => {
            updated = await result.current.mutateAsync({
                id: SESSION_ID,
                mapping: { columns: { name: "title", date: "start_date" } },
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(updated).toMatchObject({
            id: SESSION_ID,
            mapping: { columns: { name: "title", date: "start_date" } },
        });
    });
});

describe("useCancelSession", () => {
    it("deletes the session and removes it from cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        // Pre-populate cache
        queryClient.setQueryData(queryKeys.imports.session(SESSION_ID), {
            id: SESSION_ID,
            status: "mapping",
        });

        const { result } = renderHook(() => useCancelSession(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync(SESSION_ID);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        // Session query should be removed from cache
        const cached = queryClient.getQueryData(queryKeys.imports.session(SESSION_ID));
        expect(cached).toBeUndefined();
    });
});
