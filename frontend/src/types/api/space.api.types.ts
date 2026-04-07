import { components } from "@/types/api/generated";
import { SuccessResponse, PaginatedListResponse } from "./api.types";

// Operation-specific response types using utilities
export type GetSpaceByIdResponse = SuccessResponse<"get_one_space">;
export type CreateSpaceResponse = SuccessResponse<"create_space">;
export type UpdateSpaceResponse = SuccessResponse<"update_space">;
export type GetAllSpacesResponse = PaginatedListResponse<"get_all_spaces">;

// Request types (using component schemas as they're shared)
export type SpaceCreateRequest = components["schemas"]["SpacePostPayload"];
export type SpaceUpdateRequest = components["schemas"]["SpacePayload"];

// Convenience aliases - these reference the operation-specific types
export type SpaceResponse = GetSpaceByIdResponse;
export type PaginatedSpaceResponse = GetAllSpacesResponse;
