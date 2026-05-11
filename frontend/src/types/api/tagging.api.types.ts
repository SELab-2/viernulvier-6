import { components } from "@/types/api/generated";
import { SuccessResponse } from "./api.types";

export type GetEntityTagsResponse = SuccessResponse<"get_entity_tags">;
export type EntityFacetApiResponse = components["schemas"]["EntityFacetResponse"];
export type EntityTagApiResponse = components["schemas"]["EntityTagResponse"];
