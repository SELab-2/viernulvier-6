import { components } from "@/types/api/generated";
import { SuccessResponse, PaginatedListResponse } from "./api.types";

// Operation-specific response types using utilities
export type GetProductionByIdResponse = SuccessResponse<"get_one_production">;
export type CreateProductionResponse = SuccessResponse<"create_production">;
export type UpdateProductionResponse = SuccessResponse<"update_production">;
export type GetAllProductionsResponse = PaginatedListResponse<"get_all_productions">;

// Request types (using component schemas as they're shared)
export type ProductionCreateRequest = components["schemas"]["ProductionPostPayload"];
export type ProductionUpdateRequest = components["schemas"]["ProductionPayload"];

// Convenience aliases - these reference the operation-specific types
export type ProductionResponse = GetProductionByIdResponse;
export type PaginatedProductionResponse = GetAllProductionsResponse;
