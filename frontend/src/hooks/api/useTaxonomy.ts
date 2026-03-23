import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapFacets } from "@/mappers/taxonomy.mapper";
import { FacetResponse, EntityType } from "@/types/api/taxonomy.api.types";
import { Facet } from "@/types/models/taxonomy.types";

import { queryKeys } from "./query-keys";

const fetchFacets = async (entityType?: EntityType): Promise<Facet[]> => {
    const params = entityType ? { entity_type: entityType } : undefined;
    const { data } = await api.get<FacetResponse[]>("/taxonomy/facets", { params });
    return mapFacets(data);
};

export const useGetFacets = (options?: { entityType?: EntityType; enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.taxonomy.facets(options?.entityType),
        queryFn: () => fetchFacets(options?.entityType),
        ...options,
    });
};
