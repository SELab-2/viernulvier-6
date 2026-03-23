import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

import { queryKeys } from "./query-keys";

const fetchVersion = async (): Promise<string> => {
    const { data } = await api.get<string>("/version");
    return data;
};

export const useGetVersion = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.version,
        queryFn: fetchVersion,
        ...options,
    });
};
