import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_REFRESH_INTERVAL_MS, useSessionRefresh } from "@/hooks/useSessionRefresh";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
    api: {
        post: vi.fn(),
    },
}));

function setCookieString(value: string) {
    Object.defineProperty(document, "cookie", {
        configurable: true,
        value,
    });
}

describe("useSessionRefresh", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
        setCookieString("");
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        setCookieString("");
    });

    it("does not refresh when no session marker cookie exists", () => {
        renderHook(() => useSessionRefresh());

        expect(api.post).not.toHaveBeenCalled();
    });

    it("refreshes immediately and on the keepalive interval when a session marker exists", async () => {
        setCookieString("session_present=1");

        renderHook(() => useSessionRefresh());

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");

        vi.mocked(api.post).mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS);
        });

        expect(api.post).toHaveBeenCalledWith("/auth/refresh");
    });

    it("refreshes when returning to a visible tab with a session marker", async () => {
        setCookieString("session_present=1");

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
