import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapEntityFacets } from "@/mappers/taxonomy.mapper";
import { GetEntityTagsResponse } from "@/types/api/tagging.api.types";
import { EntityFacet, EntityType } from "@/types/models/taxonomy.types";

import { queryKeys } from "./query-keys";

const TAGGABLE_ENTITY_ROOT_KEYS: Record<EntityType, readonly string[]> = {
    production: ["productions"],
    artist: ["artists"],
    article: ["articles"],
    media: ["media"],
    collection: ["collections"],
};

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

export const useBulkAddEntityTags = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            entityType,
            entityIds,
            tagSlugs,
        }: {
            entityType: EntityType;
            entityIds: string[];
            tagSlugs: string[];
        }) => {
            return Promise.all(
                entityIds.map(async (entityId) => {
                    const current = await fetchEntityTags(entityType, entityId);
                    const existing = current.flatMap((facet) => facet.tags.map((tag) => tag.slug));
                    const merged = [...new Set([...existing, ...tagSlugs])];
                    return replaceEntityTagsFn(entityType, entityId, merged);
                })
            );
        },
        onSuccess: (_data, { entityType, entityIds }) => {
            entityIds.forEach((entityId) => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.taxonomy.entityTags(entityType, entityId),
                });
            });
            queryClient.invalidateQueries({ queryKey: TAGGABLE_ENTITY_ROOT_KEYS[entityType] });
        },
    });
};
