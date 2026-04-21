import type { operations } from "./generated";
import type { SuccessResponse } from "./api.types";

export type GetAllArtistsResponse = SuccessResponse<"get_all_artists">;
export type GetArtistByIdResponse = SuccessResponse<"get_one_artist">;
export type GetProductionsByArtistIdResponse =
    operations["get_productions_by_artist_id"]["responses"][200]["content"]["application/json"];

export type ArtistResponse = GetArtistByIdResponse;
