import { components } from "@/types/api/generated";
import { SuccessResponse, PaginatedListResponse } from "./api.types";

// Operation-specific response types using utilities
export type GetHallByIdResponse = SuccessResponse<"get_one_hall">;
export type CreateHallResponse = SuccessResponse<"create_hall">;
export type UpdateHallResponse = SuccessResponse<"update_hall">;
export type GetAllHallsResponse = PaginatedListResponse<"get_all_halls">;

// Request types (using component schemas as they're shared)
export type HallCreateRequest = components["schemas"]["HallPostPayload"];
export type HallUpdateRequest = components["schemas"]["HallPayload"];

// Convenience aliases - these reference the operation-specific types
export type HallResponse = GetHallByIdResponse;
export type PaginatedHallResponse = GetAllHallsResponse;
