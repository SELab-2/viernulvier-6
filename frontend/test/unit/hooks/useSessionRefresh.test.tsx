import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_REFRESH_INTERVAL_MS, useSessionRefresh } from "@/hooks/useSessionRefresh";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
    api: {
        post: vi.fn(),
    },
}));

describe("useSessionRefresh", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it("refreshes immediately without relying on a JS-readable session marker", () => {
        renderHook(() => useSessionRefresh());

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
    });

    it("refreshes on the keepalive interval after a successful refresh", async () => {
        renderHook(() => useSessionRefresh());

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");

        vi.mocked(api.post).mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS);
        });

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
    });

    it("pauses interval refreshes after a failed refresh and retries on focus", async () => {
        vi.mocked(api.post).mockRejectedValueOnce(new Error("no refresh cookie"));
        renderHook(() => useSessionRefresh());

        await act(async () => {
            await Promise.resolve();
        });

        vi.mocked(api.post).mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS);
        });
        expect(api.post).not.toHaveBeenCalled();

        vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
        await act(async () => {
            window.dispatchEvent(new Event("focus"));
        });

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
    });

    it("refreshes when returning to a visible tab", async () => {
        renderHook(() => useSessionRefresh());
        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
        vi.mocked(api.post).mockClear();

        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "visible",
        });
        await act(async () => {
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
    });
});
