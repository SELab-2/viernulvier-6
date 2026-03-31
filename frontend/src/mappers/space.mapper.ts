import { SpaceCreateRequest, SpaceResponse, SpaceUpdateRequest } from "@/types/api/space.api.types";
import { Space, SpaceCreateInput, SpaceUpdateInput } from "@/types/models/space.types";
import { toNullable } from "@/mappers/utils";

export const mapSpace = (response: SpaceResponse): Space => {
    return {
        id: response.id,
        sourceId: toNullable(response.source_id),
        nameNl: response.name_nl,
        locationId: response.location_id,
    };
};

export const mapSpaces = (response: SpaceResponse[]): Space[] => response.map(mapSpace);

export const mapCreateSpaceInput = (input: SpaceCreateInput): SpaceCreateRequest => {
    return {
        source_id: input.sourceId,
        name_nl: input.nameNl,
        location_id: input.locationId,
    };
};

export const mapUpdateSpaceInput = (input: SpaceUpdateInput): SpaceUpdateRequest => {
    return {
        ...mapCreateSpaceInput(input),
        id: input.id,
    };
};
