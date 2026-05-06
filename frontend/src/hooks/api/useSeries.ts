import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapAllSeries, mapCreateInput, mapSeries, mapUpdateInput } from "@/mappers/series.mapper";
import {
    SeriesCreateRequest,
    SeriesProductionsRequest,
    SeriesResponse,
} from "@/types/api/series.api.types";
import { Series, SeriesCreateInput } from "@/types/models/series.types";

import { queryKeys } from "./query-keys";

const fetchAllSeries = async (): Promise<Series[]> => {
    const { data } = await api.get<SeriesResponse[]>("/series");
    return mapAllSeries(data);
};

const fetchSeriesBySlug = async (slug: string): Promise<Series> => {
    const { data } = await api.get<SeriesResponse>(`/series/${encodeURIComponent(slug)}`);
    return mapSeries(data);
};

const fetchSeriesForProduction = async (productionId: string): Promise<Series[]> => {
    const { data } = await api.get<SeriesResponse[]>(`/productions/${productionId}/series`);
    return mapAllSeries(data);
};

export const useGetSeries = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.series.all,
        queryFn: fetchAllSeries,
        ...options,
    });
};

export const useGetSeriesBySlug = (slug: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.series.bySlug(slug),
        queryFn: () => fetchSeriesBySlug(slug),
        enabled: Boolean(slug) && (options?.enabled ?? true),
    });
};

export const useGetSeriesForProduction = (
    productionId: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: queryKeys.series.forProduction(productionId),
        queryFn: () => fetchSeriesForProduction(productionId),
        enabled: Boolean(productionId) && (options?.enabled ?? true),
    });
};

export const useCreateSeries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SeriesCreateInput) => {
            const body: SeriesCreateRequest = mapCreateInput(payload);
            const { data } = await api.post<SeriesResponse>("/series", body);
            return mapSeries(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
        },
    });
};

export const useUpdateSeries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: Series) => {
            const { data } = await api.put<SeriesResponse>("/series", mapUpdateInput(payload));
            return mapSeries(data);
        },
        onSuccess: (series) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.series.bySlug(series.slug) });
            queryClient.setQueryData(queryKeys.series.detail(series.id), series);
        },
    });
};

export const useDeleteSeries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (slug: string) => {
            await api.delete(`/series/${encodeURIComponent(slug)}`);
            return slug;
        },
        onSuccess: (slug) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
            queryClient.removeQueries({ queryKey: queryKeys.series.bySlug(slug) });
        },
    });
};

export const useAddProductionsToSeries = (slug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productionIds: string[]) => {
            const body: SeriesProductionsRequest = { production_ids: productionIds };
            const { data } = await api.post<SeriesResponse>(
                `/series/${encodeURIComponent(slug)}/productions`,
                body
            );
            return mapSeries(data);
        },
        onSuccess: (series) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.series.bySlug(slug) });
            queryClient.setQueryData(queryKeys.series.detail(series.id), series);
        },
    });
};

export const useRemoveProductionFromSeries = (slug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productionId: string) => {
            await api.delete(`/series/${encodeURIComponent(slug)}/productions/${productionId}`);
            return productionId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.series.bySlug(slug) });
        },
    });
};
