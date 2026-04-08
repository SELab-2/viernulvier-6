import { components } from "@/types/api/generated";

export type CollectionResponse = components["schemas"]["CollectionPayload"];
export type CollectionCreateRequest = components["schemas"]["CollectionPostPayload"];
export type CollectionUpdateRequest = components["schemas"]["CollectionPayload"];
export type CollectionItemResponse = components["schemas"]["CollectionItemPayload"];
export type CollectionItemsBulkRequest = components["schemas"]["CollectionItemsBulkPayload"];
