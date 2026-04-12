import {
    EventCreateRequest,
    EventResponse,
    EventUpdateRequest,
    PaginatedEventResponse,
} from "@/types/api/event.api.types";
import { PaginatedResult } from "@/types/api/api.types";
import { Event, EventCreateInput, EventPrice, EventUpdateInput } from "@/types/models/event.types";

import { toNullable } from "./utils";

const mapEventPrice = (price: NonNullable<EventResponse["prices"]>[number]): EventPrice => {
    return {
        id: toNullable(price.id),
        sourceId: toNullable(price.source_id),
        createdAt: toNullable(price.created_at),
        updatedAt: toNullable(price.updated_at),
        available: price.available,
        amountCents: price.amount_cents,
        boxOfficeId: toNullable(price.box_office_id),
        contingentId: toNullable(price.contingent_id),
        expiresAt: toNullable(price.expires_at),
        price: {
            id: toNullable(price.price.id),
            sourceId: toNullable(price.price.source_id),
            createdAt: toNullable(price.price.created_at),
            updatedAt: toNullable(price.price.updated_at),
            type: price.price.type,
            visibility: price.price.visibility,
            code: toNullable(price.price.code),
            descriptionNl: toNullable(price.price.description_nl),
            descriptionEn: toNullable(price.price.description_en),
            minimum: price.price.minimum,
            maximum: toNullable(price.price.maximum),
            step: price.price.step,
            order: price.price.order,
            autoSelectCombo: price.price.auto_select_combo,
            includeInPriceRange: price.price.include_in_price_range,
            cinevilleBox: price.price.cineville_box,
            membership: toNullable(price.price.membership),
        },
        rank: {
            id: toNullable(price.rank.id),
            sourceId: toNullable(price.rank.source_id),
            createdAt: toNullable(price.rank.created_at),
            updatedAt: toNullable(price.rank.updated_at),
            descriptionNl: toNullable(price.rank.description_nl),
            descriptionEn: toNullable(price.rank.description_en),
            code: price.rank.code,
            position: price.rank.position,
            soldOutBuffer: toNullable(price.rank.sold_out_buffer),
        },
    };
};

const mapEventPrices = (prices: EventResponse["prices"]): EventPrice[] => {
    return (prices ?? []).map(mapEventPrice);
};

const mapEventPriceInput = (price: EventPrice) => {
    return {
        id: price.id,
        source_id: price.sourceId,
        created_at: price.createdAt,
        updated_at: price.updatedAt,
        available: price.available,
        amount_cents: price.amountCents,
        box_office_id: price.boxOfficeId,
        contingent_id: price.contingentId,
        expires_at: price.expiresAt,
        price: {
            id: price.price.id,
            source_id: price.price.sourceId,
            created_at: price.price.createdAt,
            updated_at: price.price.updatedAt,
            type: price.price.type,
            visibility: price.price.visibility,
            code: price.price.code,
            description_nl: price.price.descriptionNl,
            description_en: price.price.descriptionEn,
            minimum: price.price.minimum,
            maximum: price.price.maximum,
            step: price.price.step,
            order: price.price.order,
            auto_select_combo: price.price.autoSelectCombo,
            include_in_price_range: price.price.includeInPriceRange,
            cineville_box: price.price.cinevilleBox,
            membership: price.price.membership,
        },
        rank: {
            id: price.rank.id,
            source_id: price.rank.sourceId,
            created_at: price.rank.createdAt,
            updated_at: price.rank.updatedAt,
            description_nl: price.rank.descriptionNl,
            description_en: price.rank.descriptionEn,
            code: price.rank.code,
            position: price.rank.position,
            sold_out_buffer: price.rank.soldOutBuffer,
        },
    };
};

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
        prices: mapEventPrices(response.prices),
    };
};

export const mapEvents = (response: EventResponse[]): Event[] => response.map(mapEvent);

export const mapPaginatedEvents = (response: PaginatedEventResponse): Event[] =>
    mapEvents(response.data);

export const mapPaginatedEventsResult = (
    response: PaginatedEventResponse
): PaginatedResult<Event> => ({
    data: mapEvents(response.data),
    nextCursor: response.next_cursor ?? null,
});

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
        prices: input.prices?.map(mapEventPriceInput),
    };
};

export const mapUpdateEventInput = (input: EventUpdateInput): EventUpdateRequest => {
    return {
        id: input.id,
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
        created_at: input.createdAt,
        prices: input.prices?.map(mapEventPriceInput),
    };
};
