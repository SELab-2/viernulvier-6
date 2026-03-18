import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FacetDto } from "@/types/dto/taxonomy.types";

export const useFacets = (entityType: string | null) => {
    return useQuery<FacetDto[]>({
        queryKey: ["facets", entityType],
        queryFn: async () => {
            const { data } = await api.get<FacetDto[]>("/taxonomy/facets", {
                params: entityType ? { entity_type: entityType } : undefined,
            });
            return data;
        },
        enabled: !!entityType,
        staleTime: 10 * 60_000,
    });
};
