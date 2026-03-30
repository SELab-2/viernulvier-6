import {
    EventCreateRequest,
    EventResponse,
    EventUpdateRequest,
    PaginatedEventResponse,
} from "@/types/api/event.api.types";
import { Event, EventCreateInput, EventUpdateInput } from "@/types/models/event.types";

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

export const mapEvent = (response: EventResponse): Event => {
    return {
        id: response.id,
        sourceId: toNullable(response.source_id),
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        startsAt: response.starts_at,
        endsAt: toNullable(response.ends_at),
        intermissionAt: toNullable(response.intermission_at),
        doorsAt: toNullable(response.doors_at),
        vendorId: toNullable(response.vendor_id),
        boxOfficeId: toNullable(response.box_office_id),
        uitdatabankId: toNullable(response.uitdatabank_id),
        maxTicketsPerOrder: toNullable(response.max_tickets_per_order),
        productionId: response.production_id,
        status: response.status,
        hallId: toNullable(response.hall_id),
    };
};

export const mapEvents = (response: EventResponse[]): Event[] => response.map(mapEvent);

export const mapPaginatedEvents = (response: PaginatedEventResponse): Event[] =>
    mapEvents(response.data);

export const mapCreateEventInput = (input: EventCreateInput): EventCreateRequest => {
    return {
        source_id: input.sourceId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        intermission_at: input.intermissionAt,
        doors_at: input.doorsAt,
        vendor_id: input.vendorId,
        box_office_id: input.boxOfficeId,
        uitdatabank_id: input.uitdatabankId,
        max_tickets_per_order: input.maxTicketsPerOrder,
        production_id: input.productionId,
        status: input.status,
        hall_id: input.hallId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

export const mapUpdateEventInput = (input: EventUpdateInput): EventUpdateRequest => {
    return {
        ...mapCreateEventInput(input),
        id: input.id,
    };
};
