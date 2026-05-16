"use client";

import { useEffect, useRef } from "react";

import { queryKeys } from "@/hooks/api";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";

export const SESSION_REFRESH_INTERVAL_MS = 4 * 60_000;

export function useSessionRefresh() {
    const refreshInFlight = useRef(false);
    const refreshEnabled = useRef(true);

    useEffect(() => {
        let mounted = true;

        const refreshSession = async () => {
            if (!refreshEnabled.current || refreshInFlight.current) return;

            refreshInFlight.current = true;
            try {
                await api.post("/auth/refresh");
                refreshEnabled.current = true;
            } catch {
                refreshEnabled.current = false;
                queryClient.removeQueries({ queryKey: queryKeys.user });
            } finally {
                if (mounted) {
                    refreshInFlight.current = false;
                }
            }
        };

        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") {
                refreshEnabled.current = true;
                void refreshSession();
            }
        };

        void refreshSession();

        const interval = window.setInterval(refreshSession, SESSION_REFRESH_INTERVAL_MS);
        const refreshOnFocus = () => {
            refreshEnabled.current = true;
            void refreshSession();
        };

        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            mounted = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);
}
