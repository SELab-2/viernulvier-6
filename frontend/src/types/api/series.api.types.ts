import { components } from "@/types/api/generated";

// We override the generated type locally to include the cover_image_url added in the backend
export type SeriesResponse = components["schemas"]["SeriesPayload"];

export type SeriesCreateRequest = components["schemas"]["SeriesPostPayload"];
export type SeriesProductionsRequest = components["schemas"]["SeriesProductionsPayload"];
