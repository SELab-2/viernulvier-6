import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapArtist, mapArtists } from "@/mappers/artist.mapper";
import {
    GetAllArtistsResponse,
    GetArtistByIdResponse,
    GetProductionsByArtistIdResponse,
} from "@/types/api/artist.api.types";
import { mapProductions } from "@/mappers/production.mapper";
import { Artist } from "@/types/models/artist.types";
import { Production } from "@/types/models/production.types";

import { queryKeys } from "./query-keys";

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

/**
 * @deprecated Temporary stub. Replace once the real useGetArtist(id) PR merges.
 * TODO: REPLACE WITH REAL HOOK — useGetArtist(id) is implemented in a separate PR.
 * Once that PR is merged, delete this stub and import the real hook in CollectionItemCard.tsx.
 */
export const useGetArtist = (
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _id: string,
    _options?: { enabled?: boolean }
): { data: Artist | undefined; isLoading: boolean; isError: boolean } => {
    return { data: undefined, isLoading: false, isError: false };
};
