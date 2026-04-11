import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapAttachMediaInput,
    mapMedia,
    mapMediaList,
    mapMediaToPayload,
    mapPaginatedMediaResult,
    mapUploadUrlInput,
    mapUploadUrlResult,
} from "@/mappers/media.mapper";
import { PaginatedResult } from "@/types/api/api.types";
import {
    AttachMediaResponse,
    GenerateUploadUrlResponse,
    GetAllMediaResponse,
    GetEntityMediaResponse,
    GetMediaByIdResponse,
} from "@/types/api/media.api.types";
import {
    AttachMediaInput,
    EntityMediaParams,
    Media,
    MediaSearchParams,
    UploadUrlInput,
    UploadUrlResult,
} from "@/types/models/media.types";

import { queryKeys } from "./query-keys";

// ── Fetch functions ──────────────────────────────────────────────────

const fetchEntityMedia = async (
    entityType: string,
    entityId: string,
    params?: EntityMediaParams
): Promise<Media[]> => {
    const { data } = await api.get<GetEntityMediaResponse>(
        `/media/entity/${entityType}/${entityId}`,
        {
            params: params && {
                role: params.role,
                cover_only: params.coverOnly,
                include_crops: params.includeCrops,
                limit: params.limit,
                offset: params.offset,
            },
        }
    );
    return mapMediaList(data);
};

const fetchMediaById = async (id: string): Promise<Media> => {
    const { data } = await api.get<GetMediaByIdResponse>(`/media/${id}`);
    return mapMedia(data);
};

const fetchAllMedia = async (params?: MediaSearchParams): Promise<PaginatedResult<Media>> => {
    const { data } = await api.get<GetAllMediaResponse>("/media", {
        params: params && {
            q: params.q,
            entity_type: params.entityType,
            entity_id: params.entityId,
            role: params.role,
            sort: params.sort,
            cursor: params.cursor,
            limit: params.limit,
        },
    });
    return mapPaginatedMediaResult(data);
};

// ── Query hooks ──────────────────────────────────────────────────────

export const useGetEntityMedia = (
    entityType: string,
    entityId: string,
    options?: { enabled?: boolean; params?: EntityMediaParams }
) => {
    return useQuery({
        queryKey: queryKeys.media.entity(entityType, entityId, options?.params),
        queryFn: () => fetchEntityMedia(entityType, entityId, options?.params),
        enabled: Boolean(entityType) && Boolean(entityId) && (options?.enabled ?? true),
    });
};

export const useGetMedia = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.media.detail(id),
        queryFn: () => fetchMediaById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetAllMedia = (options?: { enabled?: boolean; params?: MediaSearchParams }) => {
    return useQuery({
        queryKey: queryKeys.media.all(options?.params),
        queryFn: () => fetchAllMedia(options?.params),
        enabled: options?.enabled ?? true,
    });
};

export const useSearchMedia = (params: MediaSearchParams, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.media.all(params),
        queryFn: () => fetchAllMedia(params),
        enabled: options?.enabled ?? true,
    });
};

export const useGetInfiniteMedia = (
    params?: Omit<MediaSearchParams, "cursor">,
    options?: { enabled?: boolean }
) => {
    return useInfiniteQuery({
        queryKey: ["media", "infinite", params],
        queryFn: async ({ pageParam }) => fetchAllMedia({ ...params, cursor: pageParam }),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: null as string | null,
        ...options,
    });
};

// ── Mutation hooks ───────────────────────────────────────────────────

export const useGenerateUploadUrl = () => {
    return useMutation({
        mutationFn: async (input: UploadUrlInput): Promise<UploadUrlResult> => {
            const { data } = await api.post<GenerateUploadUrlResponse>(
                "/media/upload-url",
                mapUploadUrlInput(input)
            );
            return mapUploadUrlResult(data);
        },
    });
};

export const useAttachMedia = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            entityType,
            entityId,
            input,
        }: {
            entityType: string;
            entityId: string;
            input: AttachMediaInput;
        }): Promise<Media> => {
            const { data } = await api.post<AttachMediaResponse>(
                `/media/entity/${entityType}/${entityId}/attach`,
                mapAttachMediaInput(input)
            );
            return mapMedia(data);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.media.entity(variables.entityType, variables.entityId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
        },
    });
};

export const useUnlinkMedia = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            entityType,
            entityId,
            mediaId,
        }: {
            entityType: string;
            entityId: string;
            mediaId: string;
        }) => {
            await api.delete(`/media/entity/${entityType}/${entityId}/${mediaId}`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.media.entity(variables.entityType, variables.entityId),
            });
        },
    });
};

export const useUpdateMedia = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (media: Media): Promise<Media> => {
            const { data } = await api.put<GetMediaByIdResponse>(
                `/media/${media.id}`,
                mapMediaToPayload(media)
            );
            return mapMedia(data);
        },
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
            queryClient.setQueryData(queryKeys.media.detail(updated.id), updated);
        },
    });
};

export const useDeleteMedia = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/media/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
            queryClient.removeQueries({ queryKey: queryKeys.media.detail(id) });
        },
    });
};
