"use client";

import { useEffect, useRef } from "react";

import { queryKeys } from "@/hooks/api";
import { fetchCurrentUser } from "@/hooks/useAuth";
import { refreshAuthSession } from "@/lib/api-client";
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
                await refreshAuthSession();
                refreshEnabled.current = true;
                if (!queryClient.getQueryData(queryKeys.user)) {
                    await queryClient.fetchQuery({
                        queryKey: queryKeys.user,
                        queryFn: fetchCurrentUser,
                        staleTime: 2.5 * 60_000,
                    });
                }
            } catch {
                refreshEnabled.current = false;
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
