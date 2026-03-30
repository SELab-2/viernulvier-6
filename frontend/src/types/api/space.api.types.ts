import { components } from "@/types/api/generated";

export type SpaceResponse = components["schemas"]["SpacePayload"];
export type SpaceCreateRequest = components["schemas"]["SpacePostPayload"];
export type SpaceUpdateRequest = components["schemas"]["SpacePayload"];
export type PaginatedSpaceResponse = components["schemas"]["PaginatedResponse_SpacePayload"];
