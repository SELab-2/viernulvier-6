import { components } from "@/types/api/generated";

export type LocationResponse = components["schemas"]["LocationPayload"];
export type LocationCreateRequest = components["schemas"]["LocationPostPayload"];
export type LocationUpdateRequest = components["schemas"]["LocationPayload"];
export type PaginatedLocationResponse = components["schemas"]["PaginatedResponse_LocationPayload"];
