import { components } from "@/types/api/generated";

export type ProductionResponse = components["schemas"]["ProductionPayload"];
export type ProductionCreateRequest = components["schemas"]["ProductionPostPayload"];
export type ProductionUpdateRequest = components["schemas"]["ProductionPayload"];
export type PaginatedProductionResponse =
    components["schemas"]["PaginatedResponse_ProductionPayload"];
