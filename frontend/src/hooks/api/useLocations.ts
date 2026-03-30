import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateLocationInput,
    mapLocation,
    mapPaginatedLocations,
    mapUpdateLocationInput,
} from "@/mappers/location.mapper";
import {
    CreateLocationResponse,
    GetAllLocationsResponse,
    GetLocationByIdResponse,
    UpdateLocationResponse,
} from "@/types/api/location.api.types";
import { Location, LocationCreateInput, LocationUpdateInput } from "@/types/models/location.types";

import { queryKeys } from "./query-keys";

const fetchLocations = async (): Promise<Location[]> => {
    const { data } = await api.get<GetAllLocationsResponse>("/locations");
    return mapPaginatedLocations(data);
};

const fetchLocationById = async (id: string): Promise<Location> => {
    const { data } = await api.get<GetLocationByIdResponse>(`/locations/${id}`);
    return mapLocation(data);
};

export const useGetLocations = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.locations.all,
        queryFn: fetchLocations,
        ...options,
    });
};

export const useGetLocation = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.locations.detail(id),
        queryFn: () => fetchLocationById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useCreateLocation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: LocationCreateInput) => {
            const { data } = await api.post<CreateLocationResponse>(
                "/locations",
                mapCreateLocationInput(payload)
            );
            return mapLocation(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
        },
    });
};

export const useUpdateLocation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: LocationUpdateInput) => {
            const { data } = await api.put<UpdateLocationResponse>(
                "/locations",
                mapUpdateLocationInput(payload)
            );
            return mapLocation(data);
        },
        onSuccess: (location) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
            queryClient.setQueryData(queryKeys.locations.detail(location.id), location);
        },
    });
};

export const useDeleteLocation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/locations/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
            queryClient.removeQueries({ queryKey: queryKeys.locations.detail(id) });
        },
    });
};
