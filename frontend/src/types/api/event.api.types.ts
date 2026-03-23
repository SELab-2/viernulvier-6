import { components } from "@/types/api/generated";

export type EventResponse = components["schemas"]["EventPayload"];
export type EventCreateRequest = components["schemas"]["EventPostPayload"];
export type EventUpdateRequest = components["schemas"]["EventPayload"];
