import {
    useMutation,
    useQuery,
    useQueryClient,
    useInfiniteQuery,
    useQueries,
} from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateProductionInput,
    mapPaginatedProductionsResult,
    mapProduction,
    mapUpdateProductionInput,
} from "@/mappers/production.mapper";
import {
    CreateProductionResponse,
    GetAllProductionsResponse,
    GetProductionByIdResponse,
    UpdateProductionResponse,
} from "@/types/api/production.api.types";
import { PaginatedResult, SearchPaginationParams } from "@/types/api/api.types";
import {
    Production,
    ProductionCreateInput,
    ProductionUpdateInput,
} from "@/types/models/production.types";

import { queryKeys } from "./query-keys";

const fetchProductions = async (
    params?: SearchPaginationParams
): Promise<PaginatedResult<Production>> => {
    const { data } = await api.get<GetAllProductionsResponse>("/productions", { params });
    return mapPaginatedProductionsResult(data);
};

const fetchProductionById = async (id: string): Promise<Production> => {
    const { data } = await api.get<GetProductionByIdResponse>(`/productions/${id}`);
    return mapProduction(data);
};

export const useGetProductions = (options?: {
    enabled?: boolean;
    params?: SearchPaginationParams;
}) => {
    return useQuery({
        queryKey: queryKeys.productions.all(options?.params),
        queryFn: () => fetchProductions(options?.params),
        ...options,
    });
};

export const useGetInfiniteProductions = (options?: { enabled?: boolean }) => {
    return useInfiniteQuery({
        queryKey: ["productions", "infinite"],
        queryFn: async ({ pageParam }) =>
            fetchProductions(pageParam ? { cursor: pageParam } : undefined),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: null as string | null,
        ...options,
    });
};

export const useGetProduction = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.productions.detail(id),
        queryFn: () => fetchProductionById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetProductionsByIds = (ids: string[]) => {
    return useQueries({
        queries: ids.map((id) => ({
            queryKey: queryKeys.productions.detail(id),
            queryFn: () => fetchProductionById(id),
            enabled: Boolean(id),
        })),
    });
};

export const useCreateProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ProductionCreateInput) => {
            const { data } = await api.post<CreateProductionResponse>(
                "/productions",
                mapCreateProductionInput(payload)
            );
            return mapProduction(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.productions.all() });
        },
    });
};

export const useUpdateProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ProductionUpdateInput) => {
            const { data } = await api.put<UpdateProductionResponse>(
                "/productions",
                mapUpdateProductionInput(payload)
            );
            return mapProduction(data);
        },
        onSuccess: (production) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.productions.all() });
            queryClient.setQueryData(queryKeys.productions.detail(production.id), production);
        },
    });
};

export const useDeleteProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/productions/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.productions.all() });
            queryClient.removeQueries({ queryKey: queryKeys.productions.detail(id) });
        },
    });
};
