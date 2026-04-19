import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapArtists } from "@/mappers/artist.mapper";
import { ArtistResponse } from "@/types/api/artist.api.types";
import { Artist } from "@/types/models/artist.types";

import { queryKeys } from "./query-keys";

export const useGetArtists = () => {
    return useQuery({
        queryKey: queryKeys.artists.all,
        queryFn: async (): Promise<Artist[]> => {
            const { data } = await api.get<ArtistResponse[]>("/artists");
            return mapArtists(data);
        },
    });
};

// TODO: REPLACE WITH REAL HOOK — useGetArtist(id) is implemented in a separate PR.
// Once that PR is merged, delete this stub and import the real hook in CollectionItemCard.tsx.
export const useGetArtist = (_id: string, _options?: { enabled?: boolean }) => {
    return { data: undefined, isLoading: false, isError: false };
};
