import { components } from "@/types/api/generated";

export type HallResponse = components["schemas"]["HallPayload"];
export type HallCreateRequest = components["schemas"]["HallPostPayload"];
export type HallUpdateRequest = components["schemas"]["HallPayload"];
export type PaginatedHallResponse = components["schemas"]["PaginatedResponse_HallPayload"];
