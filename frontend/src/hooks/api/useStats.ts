import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { GetStatsResponse } from "@/types/api/stats.api.types";

import { queryKeys } from "./query-keys";

const fetchStats = async (): Promise<GetStatsResponse> => {
    const { data } = await api.get<GetStatsResponse>("/stats");
    return data;
};

export const useGetStats = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.stats,
        queryFn: fetchStats,
        ...options,
    });
};
