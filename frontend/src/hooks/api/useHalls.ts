import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateHallInput,
    mapHall,
    mapPaginatedHalls,
    mapUpdateHallInput,
} from "@/mappers/hall.mapper";
import {
    CreateHallResponse,
    GetAllHallsResponse,
    GetHallByIdResponse,
    UpdateHallResponse,
} from "@/types/api/hall.api.types";
import { Hall, HallCreateInput, HallUpdateInput } from "@/types/models/hall.types";

import { queryKeys } from "./query-keys";

const fetchHalls = async (): Promise<Hall[]> => {
    const { data } = await api.get<GetAllHallsResponse>("/halls");
    return mapPaginatedHalls(data);
};

const fetchHallById = async (id: string): Promise<Hall> => {
    const { data } = await api.get<GetHallByIdResponse>(`/halls/${id}`);
    return mapHall(data);
};

export const useGetHalls = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.halls.all,
        queryFn: fetchHalls,
        ...options,
    });
};

export const useGetHall = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.halls.detail(id),
        queryFn: () => fetchHallById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useCreateHall = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: HallCreateInput) => {
            const { data } = await api.post<CreateHallResponse>(
                "/halls",
                mapCreateHallInput(payload)
            );
            return mapHall(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.halls.all });
        },
    });
};

export const useUpdateHall = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: HallUpdateInput) => {
            const { data } = await api.put<UpdateHallResponse>(
                "/halls",
                mapUpdateHallInput(payload)
            );
            return mapHall(data);
        },
        onSuccess: (hall) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.halls.all });
            queryClient.setQueryData(queryKeys.halls.detail(hall.id), hall);
        },
    });
};

export const useDeleteHall = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/halls/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.halls.all });
            queryClient.removeQueries({ queryKey: queryKeys.halls.detail(id) });
        },
    });
};
