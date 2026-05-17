import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapArtist, mapArtists } from "@/mappers/artist.mapper";
import {
    ArtistResponse,
    GetAllArtistsResponse,
    GetArtistByIdResponse,
    GetArtistsByProductionIdResponse,
    GetProductionsByArtistIdResponse,
} from "@/types/api/artist.api.types";
import { mapProductions } from "@/mappers/production.mapper";
import { Artist } from "@/types/models/artist.types";
import { Production } from "@/types/models/production.types";
import { PaginatedResult } from "@/types/api/api.types";

import { queryKeys } from "./query-keys";

type ArtistCreateInput = { name: string };
type ArtistUpdateInput = { id: string; name: string; slug: string };

const fetchArtistsPage = async (params: {
    q?: string;
    cursor?: string;
    limit?: number;
}): Promise<PaginatedResult<Artist>> => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.limit) search.set("limit", String(params.limit));
    const url = `/artists${search.toString() ? `?${search}` : ""}`;
    const { data } = await api.get<GetAllArtistsResponse>(url);
    return {
        data: mapArtists(data.data),
        nextCursor: data.next_cursor ?? null,
    };
};

const fetchArtists = async (q?: string): Promise<Artist[]> => {
    const { data } = await fetchArtistsPage({ q });
    return data;
};

const fetchArtistById = async (id: string): Promise<Artist> => {
    const { data } = await api.get<GetArtistByIdResponse>(`/artists/${id}`);
    return mapArtist(data);
};

const fetchProductionsByArtistId = async (id: string): Promise<Production[]> => {
    const { data } = await api.get<GetProductionsByArtistIdResponse>(`/artists/${id}/productions`);
    return mapProductions(data);
};

export const useGetArtists = (options?: { q?: string; enabled?: boolean }) => {
    const q = options?.q || undefined;
    return useQuery({
        queryKey: queryKeys.artists.list({ q }),
        queryFn: () => fetchArtists(q),
        enabled: options?.enabled ?? true,
    });
};

export const useGetInfiniteArtists = (params?: { q?: string; limit?: number }) => {
    const q = params?.q || undefined;
    const limit = params?.limit;
    return useInfiniteQuery({
        queryKey: queryKeys.artists.infinite({ q, limit }),
        queryFn: ({ pageParam }) =>
            fetchArtistsPage({ q, limit, cursor: pageParam as string | undefined }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
};

export const useGetArtist = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.artists.detail(id),
        queryFn: () => fetchArtistById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

const fetchArtistsByProductionId = async (productionId: string): Promise<Artist[]> => {
    const { data } = await api.get<GetArtistsByProductionIdResponse>(
        `/productions/${productionId}/artists`
    );
    return mapArtists(data);
};

export const useGetArtistsByProduction = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.artists.byProduction(id),
        queryFn: () => fetchArtistsByProductionId(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetProductionsByArtist = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.artists.productions(id),
        queryFn: () => fetchProductionsByArtistId(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useCreateArtist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: ArtistCreateInput) => {
            const { data } = await api.post<ArtistResponse>("/artists", payload);
            return mapArtist(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.artists.all });
        },
    });
};

export const useUpdateArtist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: ArtistUpdateInput) => {
            const { data } = await api.put<ArtistResponse>(`/artists/${payload.id}`, {
                name: payload.name,
                slug: payload.slug,
            });
            return mapArtist(data);
        },
        onSuccess: (artist) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.artists.all });
            queryClient.setQueryData(queryKeys.artists.detail(artist.id), artist);
        },
    });
};

export const useDeleteArtist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/artists/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.artists.all });
            queryClient.removeQueries({ queryKey: queryKeys.artists.detail(id) });
        },
    });
};
