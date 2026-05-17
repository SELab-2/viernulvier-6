import { components } from "@/types/api/generated";
import { SuccessResponse } from "./api.types";

// Response types from specific operations
export type GetFacetsResponse = SuccessResponse<"get_facets">;

// Component schema types (these are used across multiple operations)
export type FacetResponse = components["schemas"]["FacetResponse"];
export type TagResponse = components["schemas"]["TagResponse"];
export type EntityType = components["schemas"]["EntityType"];
export type Facet = components["schemas"]["Facet"];

// Tag mutation types
export type CreateTagRequest = components["schemas"]["CreateTagRequest"];
export type UpdateTagRequest = components["schemas"]["UpdateTagRequest"];
export type TagUsageResponse = components["schemas"]["TagUsageResponse"];
export type CreateTagResponse = SuccessResponse<"create_tag">;
