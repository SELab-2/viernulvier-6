import { components, operations } from "@/types/api/generated";
import { SuccessResponse } from "./api.types";

// Response types from specific operations
export type GetFacetsResponse = SuccessResponse<"get_facets">;

// Component schema types (these are used across multiple operations)
export type FacetResponse = components["schemas"]["FacetResponse"];
export type TagResponse = components["schemas"]["TagResponse"];
export type EntityType = components["schemas"]["EntityType"];
export type Facet = components["schemas"]["Facet"];
