import { components } from "@/types/api/generated";
import { SuccessResponse, PaginatedListResponse } from "./api.types";

// Operation-specific response types using utilities
export type GetLocationByIdResponse = SuccessResponse<"get_one_location">;
export type CreateLocationResponse = SuccessResponse<"create_location">;
export type UpdateLocationResponse = SuccessResponse<"update_location">;
export type GetAllLocationsResponse = PaginatedListResponse<"get_all_locations">;

// Request types (using component schemas as they're shared)
export type LocationCreateRequest = components["schemas"]["LocationPostPayload"];
export type LocationUpdateRequest = components["schemas"]["LocationPayload"];

// Convenience aliases - these reference the operation-specific types
export type LocationResponse = GetLocationByIdResponse;
export type PaginatedLocationResponse = GetAllLocationsResponse;
