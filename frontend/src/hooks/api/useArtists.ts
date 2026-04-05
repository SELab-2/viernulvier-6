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
