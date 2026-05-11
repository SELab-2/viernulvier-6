import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapFacets, mapTag } from "@/mappers/taxonomy.mapper";
import {
    CreateTagRequest,
    CreateTagResponse,
    GetFacetsResponse,
    UpdateTagRequest,
    TagUsageResponse,
    EntityType,
} from "@/types/api/taxonomy.api.types";
import { Facet, Tag } from "@/types/models/taxonomy.types";

import { queryKeys } from "./query-keys";

const fetchFacets = async (entityType?: EntityType): Promise<Facet[]> => {
    const params = entityType ? { entity_type: entityType } : undefined;
    const { data } = await api.get<GetFacetsResponse>("/taxonomy/facets", { params });
    return mapFacets(data);
};

export const useGetFacets = (options?: { entityType?: EntityType; enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.taxonomy.facets(options?.entityType),
        queryFn: () => fetchFacets(options?.entityType),
        ...options,
    });
};

const createTagFn = async (body: CreateTagRequest): Promise<Tag> => {
    const { data } = await api.post<CreateTagResponse>("/taxonomy/tags", body);
    return mapTag(data);
};

export const useCreateTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTagFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.taxonomy.facets() });
        },
    });
};

const updateTagFn = async ({
    slug,
    translations,
}: {
    slug: string;
    translations: UpdateTagRequest["translations"];
}): Promise<void> => {
    await api.patch(`/taxonomy/tags/${slug}`, { translations });
};

export const useUpdateTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTagFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.taxonomy.facets() });
        },
    });
};

type DeleteTagResult = { usage_count: number } | undefined;

const deleteTagFn = async ({
    slug,
    force,
}: {
    slug: string;
    force: boolean;
}): Promise<DeleteTagResult> => {
    const url = force ? `/taxonomy/tags/${slug}?force=true` : `/taxonomy/tags/${slug}`;
    const response = await api.delete<TagUsageResponse>(url, {
        validateStatus: (status) => status === 204 || status === 409,
    });
    if (response.status === 409) {
        return { usage_count: response.data.usage_count };
    }
    return undefined;
};

export const useDeleteTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTagFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.taxonomy.facets() });
            queryClient.invalidateQueries({ queryKey: ["taxonomy", "entity-tags"] });
        },
    });
};
