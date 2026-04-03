import { ArtistResponse } from "@/types/api/artist.api.types";
import { Artist } from "@/types/models/artist.types";

export const mapArtist = (r: ArtistResponse): Artist => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
});

export const mapArtists = (rs: ArtistResponse[]): Artist[] => rs.map(mapArtist);
