import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapEntityFacets } from "@/mappers/taxonomy.mapper";
import { GetEntityTagsResponse } from "@/types/api/tagging.api.types";
import { EntityFacet, EntityType } from "@/types/models/taxonomy.types";

import { queryKeys } from "./query-keys";

const fetchEntityTags = async (
    entityType: EntityType,
    entityId: string
): Promise<EntityFacet[]> => {
    const { data } = await api.get<GetEntityTagsResponse>(`/tags/${entityType}/${entityId}`);
    return mapEntityFacets(data);
};

export const useGetEntityTags = (
    entityType: EntityType,
    entityId: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: queryKeys.taxonomy.entityTags(entityType, entityId),
        queryFn: () => fetchEntityTags(entityType, entityId),
        enabled: (options?.enabled ?? true) && !!entityId,
    });
};

const replaceEntityTagsFn = async (
    entityType: EntityType,
    entityId: string,
    tagSlugs: string[]
): Promise<EntityFacet[]> => {
    const { data } = await api.put<GetEntityTagsResponse>(`/tags/${entityType}/${entityId}`, {
        tag_slugs: tagSlugs,
    });
    return mapEntityFacets(data);
};

export const useReplaceEntityTags = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            entityType,
            entityId,
            tagSlugs,
        }: {
            entityType: EntityType;
            entityId: string;
            tagSlugs: string[];
        }) => replaceEntityTagsFn(entityType, entityId, tagSlugs),
        onSuccess: (_data, { entityType, entityId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taxonomy.entityTags(entityType, entityId),
            });
        },
    });
};
