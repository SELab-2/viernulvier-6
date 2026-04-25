import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCollection,
    mapCollections,
    mapCreateInput,
    mapItemsBulkInput,
    mapUpdateInput,
} from "@/mappers/collection.mapper";
import {
    CollectionCreateRequest,
    CollectionItemResponse,
    CollectionItemsBulkRequest,
    CollectionResponse,
} from "@/types/api/collection.api.types";
import {
    Collection,
    CollectionContentType,
    CollectionCreateInput,
    CollectionItemTranslation,
    CollectionItemsBulkInput,
} from "@/types/models/collection.types";

import { queryKeys } from "./query-keys";

const fetchCollections = async (): Promise<Collection[]> => {
    const { data } = await api.get<CollectionResponse[]>("/collections");
    return mapCollections(data);
};

const fetchCollectionById = async (id: string): Promise<Collection> => {
    const { data } = await api.get<CollectionResponse>(`/collections/${id}`);
    return mapCollection(data);
};

const fetchCollectionBySlug = async (slug: string): Promise<Collection> => {
    const { data } = await api.get<CollectionResponse>(
        `/collections/slug/${encodeURIComponent(slug)}`
    );
    return mapCollection(data);
};

export const useGetCollections = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.collections.all,
        queryFn: fetchCollections,
        ...options,
    });
};

export const useGetCollection = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.collections.detail(id),
        queryFn: () => fetchCollectionById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetCollectionBySlug = (slug: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.collections.bySlug(slug),
        queryFn: () => fetchCollectionBySlug(slug),
        enabled: Boolean(slug) && (options?.enabled ?? true),
    });
};

export const useCreateCollection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CollectionCreateInput) => {
            const body: CollectionCreateRequest = mapCreateInput(payload);
            const { data } = await api.post<CollectionResponse>("/collections", body);
            return mapCollection(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
        },
    });
};

export const useUpdateCollection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: Collection) => {
            const { data } = await api.put<CollectionResponse>(
                "/collections",
                mapUpdateInput(payload)
            );
            return mapCollection(data);
        },
        onSuccess: (collection) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
            queryClient.setQueryData(queryKeys.collections.detail(collection.id), collection);
        },
    });
};

export const useUpdateCollectionItems = (id: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CollectionItemsBulkInput) => {
            const body: CollectionItemsBulkRequest = mapItemsBulkInput(payload);
            await api.put(`/collections/${id}/items`, body);
            return payload;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
        },
    });
};

export const useDeleteCollection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/collections/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
            queryClient.removeQueries({ queryKey: queryKeys.collections.detail(id) });
        },
    });
};

type AddCollectionItemInput = {
    collectionId: string;
    contentId: string;
    contentType: CollectionContentType;
    position: number;
    translations?: CollectionItemTranslation[];
};

export const useAddCollectionItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: AddCollectionItemInput) => {
            const translations = (
                payload.translations ?? [
                    { languageCode: "nl", comment: null },
                    { languageCode: "en", comment: null },
                ]
            ).map((t) => ({ language_code: t.languageCode, comment: t.comment }));

            const { data } = await api.post<CollectionItemResponse>(
                `/collections/${payload.collectionId}/items`,
                {
                    content_id: payload.contentId,
                    content_type: payload.contentType,
                    position: payload.position,
                    translations,
                }
            );
            return data;
        },
        onSuccess: (_, payload) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.collections.detail(payload.collectionId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
        },
    });
};
