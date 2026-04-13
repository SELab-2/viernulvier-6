import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { StatsPayload } from "@/types/api/stats.api.types";

import { queryKeys } from "./query-keys";

const fetchStats = async (): Promise<StatsPayload> => {
    const { data } = await api.get<StatsPayload>("/stats");
    return data;
};

export const useGetStats = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.stats,
        queryFn: fetchStats,
        staleTime: 60 * 60 * 1000,
        ...options,
    });
};
