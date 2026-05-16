import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_REFRESH_INTERVAL_MS, useSessionRefresh } from "@/hooks/useSessionRefresh";
import { queryKeys } from "@/hooks/api";
import { refreshAuthSession } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { fetchCurrentUser } from "@/hooks/useAuth";
import { UserRole } from "@/types/models/user.types";

vi.mock("@/lib/api-client", () => ({
    refreshAuthSession: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
    fetchCurrentUser: vi.fn(),
}));

describe("useSessionRefresh", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(refreshAuthSession).mockResolvedValue({ success: true, message: "refreshed" });
        vi.mocked(fetchCurrentUser).mockResolvedValue({
            id: "editor-1",
            email: "editor@example.com",
            role: UserRole.EDITOR,
        });
        queryClient.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        queryClient.clear();
    });

    it("refreshes immediately without relying on a JS-readable session marker", () => {
        renderHook(() => useSessionRefresh());

        expect(refreshAuthSession).toHaveBeenCalled();
    });

    it("hydrates the user cache after a successful refresh", async () => {
        renderHook(() => useSessionRefresh());

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetchCurrentUser).toHaveBeenCalled();
        expect(queryClient.getQueryData(queryKeys.user)).toEqual({
            id: "editor-1",
            email: "editor@example.com",
            role: UserRole.EDITOR,
        });
    });

    it("refreshes on the keepalive interval after a successful refresh", async () => {
        renderHook(() => useSessionRefresh());

        expect(refreshAuthSession).toHaveBeenCalled();

        vi.mocked(refreshAuthSession).mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS);
        });

        expect(refreshAuthSession).toHaveBeenCalled();
    });

    it("pauses interval refreshes after a failed refresh and retries on focus", async () => {
        vi.mocked(refreshAuthSession).mockRejectedValueOnce(new Error("no refresh cookie"));
        renderHook(() => useSessionRefresh());

        await act(async () => {
            await Promise.resolve();
        });

        vi.mocked(refreshAuthSession).mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS);
        });
        expect(refreshAuthSession).not.toHaveBeenCalled();

        vi.mocked(refreshAuthSession).mockResolvedValue({ success: true, message: "refreshed" });
        await act(async () => {
            window.dispatchEvent(new Event("focus"));
        });

        expect(refreshAuthSession).toHaveBeenCalled();
    });

    it("refreshes when returning to a visible tab", async () => {
        renderHook(() => useSessionRefresh());
        expect(refreshAuthSession).toHaveBeenCalled();
        vi.mocked(refreshAuthSession).mockClear();

        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "visible",
        });
        await act(async () => {
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(refreshAuthSession).toHaveBeenCalled();
    });
});
