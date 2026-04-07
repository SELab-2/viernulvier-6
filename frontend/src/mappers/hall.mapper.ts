import {
    HallCreateRequest,
    HallResponse,
    HallUpdateRequest,
    PaginatedHallResponse,
} from "@/types/api/hall.api.types";
import { PaginatedResult } from "@/types/api/api.types";
import { Hall, HallCreateInput, HallUpdateInput } from "@/types/models/hall.types";

import { toNullable } from "./utils";

export const mapHall = (response: HallResponse): Hall => {
    return {
        id: response.id,
        sourceId: toNullable(response.source_id),
        vendorId: toNullable(response.vendor_id),
        boxOfficeId: toNullable(response.box_office_id),
        seatSelection: toNullable(response.seat_selection),
        openSeating: toNullable(response.open_seating),
        name: response.name,
        remark: toNullable(response.remark),
        slug: response.slug,
        spaceId: toNullable(response.space_id),
    };
};

export const mapHalls = (response: HallResponse[]): Hall[] => response.map(mapHall);

export const mapPaginatedHalls = (response: PaginatedHallResponse): Hall[] =>
    mapHalls(response.data);

export const mapPaginatedHallsResult = (
    response: PaginatedHallResponse
): PaginatedResult<Hall> => ({
    data: mapHalls(response.data),
    nextCursor: response.next_cursor ?? null,
});

export const mapCreateHallInput = (input: HallCreateInput): HallCreateRequest => {
    return {
        source_id: input.sourceId,
        slug: input.slug,
        vendor_id: input.vendorId,
        box_office_id: input.boxOfficeId,
        seat_selection: input.seatSelection,
        open_seating: input.openSeating,
        name: input.name,
        remark: input.remark,
        space_id: input.spaceId,
    };
};

export const mapUpdateHallInput = (input: HallUpdateInput): HallUpdateRequest => {
    return {
        ...mapCreateHallInput(input),
        id: input.id,
    };
};
