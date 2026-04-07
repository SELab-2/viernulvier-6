import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateSpaceInput,
    mapPaginatedSpacesResult,
    mapSpace,
    mapUpdateSpaceInput,
} from "@/mappers/space.mapper";
import {
    CreateSpaceResponse,
    GetAllSpacesResponse,
    GetSpaceByIdResponse,
    UpdateSpaceResponse,
} from "@/types/api/space.api.types";
import { PaginationParams, PaginatedResult } from "@/types/api/api.types";
import { Space, SpaceCreateInput, SpaceUpdateInput } from "@/types/models/space.types";

import { queryKeys } from "./query-keys";

const fetchSpaces = async (params?: PaginationParams): Promise<PaginatedResult<Space>> => {
    const { data } = await api.get<GetAllSpacesResponse>("/spaces", { params });
    return mapPaginatedSpacesResult(data);
};

const fetchSpaceById = async (id: string): Promise<Space> => {
    const { data } = await api.get<GetSpaceByIdResponse>(`/spaces/${id}`);
    return mapSpace(data);
};

export const useGetSpaces = (options?: { enabled?: boolean; pagination?: PaginationParams }) => {
    return useQuery({
        queryKey: queryKeys.spaces.all(options?.pagination),
        queryFn: () => fetchSpaces(options?.pagination),
        ...options,
    });
};

export const useGetSpace = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.spaces.detail(id),
        queryFn: () => fetchSpaceById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useCreateSpace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SpaceCreateInput) => {
            const { data } = await api.post<CreateSpaceResponse>(
                "/spaces",
                mapCreateSpaceInput(payload)
            );
            return mapSpace(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all() });
        },
    });
};

export const useUpdateSpace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SpaceUpdateInput) => {
            const { data } = await api.put<UpdateSpaceResponse>(
                "/spaces",
                mapUpdateSpaceInput(payload)
            );
            return mapSpace(data);
        },
        onSuccess: (space) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all() });
            queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
        },
    });
};

export const useDeleteSpace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/spaces/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all() });
            queryClient.removeQueries({ queryKey: queryKeys.spaces.detail(id) });
        },
    });
};
