import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapArtist, mapArtists } from "@/mappers/artist.mapper";
import {
    ArtistResponse,
    GetAllArtistsResponse,
    GetArtistByIdResponse,
    GetProductionsByArtistIdResponse,
} from "@/types/api/artist.api.types";
import { mapProductions } from "@/mappers/production.mapper";
import { Artist } from "@/types/models/artist.types";
import { Production } from "@/types/models/production.types";

import { queryKeys } from "./query-keys";

type ArtistCreateInput = { name: string };
type ArtistUpdateInput = { id: string; name: string; slug: string };

const fetchArtists = async (): Promise<Artist[]> => {
    const { data } = await api.get<GetAllArtistsResponse>("/artists");
    return mapArtists(data);
};

const fetchArtistById = async (id: string): Promise<Artist> => {
    const { data } = await api.get<GetArtistByIdResponse>(`/artists/${id}`);
    return mapArtist(data);
};

const fetchProductionsByArtistId = async (id: string): Promise<Production[]> => {
    const { data } = await api.get<GetProductionsByArtistIdResponse>(`/artists/${id}/productions`);
    return mapProductions(data);
};

export const useGetArtists = () => {
    return useQuery({
        queryKey: queryKeys.artists.all,
        queryFn: fetchArtists,
    });
};

export const useGetArtist = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.artists.detail(id),
        queryFn: () => fetchArtistById(id),
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
