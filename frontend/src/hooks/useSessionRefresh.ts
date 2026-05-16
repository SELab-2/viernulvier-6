"use client";

import { useEffect, useRef } from "react";

import { queryKeys } from "@/hooks/api";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";

export const SESSION_REFRESH_INTERVAL_MS = 4 * 60_000;

function hasSessionMarker(): boolean {
    if (typeof document === "undefined") return false;

    return document.cookie
        .split(";")
        .map((cookie) => cookie.trim())
        .some((cookie) => cookie.startsWith("session_present="));
}

export function useSessionRefresh() {
    const refreshInFlight = useRef(false);

    useEffect(() => {
        let mounted = true;

        const refreshSession = async () => {
            if (!hasSessionMarker() || refreshInFlight.current) return;

            refreshInFlight.current = true;
            try {
                await api.post("/auth/refresh");
            } catch {
                queryClient.removeQueries({ queryKey: queryKeys.user });
            } finally {
                if (mounted) {
                    refreshInFlight.current = false;
                }
            }
        };

        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void refreshSession();
            }
        };

        void refreshSession();

        const interval = window.setInterval(refreshSession, SESSION_REFRESH_INTERVAL_MS);
        window.addEventListener("focus", refreshSession);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            mounted = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", refreshSession);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);
}
