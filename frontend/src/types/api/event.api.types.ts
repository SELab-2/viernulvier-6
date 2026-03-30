import { components, operations } from "@/types/api/generated";
import { SuccessResponse, PaginatedListResponse } from "./api.types";

// Operation-specific response types using utilities
export type GetEventByIdResponse = SuccessResponse<"get_event_by_id">;
export type CreateEventResponse = SuccessResponse<"create_event">;
export type UpdateEventResponse = SuccessResponse<"update_event">;
export type GetAllEventsResponse = PaginatedListResponse<"get_all_events">;
export type GetEventsByProductionIdResponse =
    operations["get_events_by_production_id"]["responses"][200]["content"]["application/json"];

// Request types (using component schemas as they're shared)
export type EventCreateRequest = components["schemas"]["EventPostPayload"];
export type EventUpdateRequest = components["schemas"]["EventPayload"];

// Convenience aliases - these reference the operation-specific types
export type EventResponse = GetEventByIdResponse;
export type PaginatedEventResponse = GetAllEventsResponse;
