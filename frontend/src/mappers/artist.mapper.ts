import { ArtistResponse } from "@/types/api/artist.api.types";
import { Artist } from "@/types/models/artist.types";

import { toNullable } from "./utils";

export const mapArtist = (r: ArtistResponse): Artist => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    coverImageUrl: toNullable(r.cover_image_url),
});

export const mapArtists = (rs: ArtistResponse[]): Artist[] => rs.map(mapArtist);
