import { LocationResponse } from "@/types/api/location.api.types";
import { LocationCreateRequest, LocationUpdateRequest } from "@/types/api/location.api.types";
import { Location, LocationCreateInput, LocationUpdateInput } from "@/types/models/location.types";

const buildAddress = (
    location: Pick<Location, "street" | "number" | "postalCode" | "city" | "country">
): string => {
    const lineOne = [location.street, location.number].filter(Boolean).join(" ");
    const lineTwo = [location.postalCode, location.city].filter(Boolean).join(" ");

    return [lineOne, lineTwo, location.country].filter(Boolean).join(", ");
};

export const mapLocation = (response: LocationResponse): Location => {
    const location: Omit<Location, "address"> = {
        id: response.id,
        sourceId: response.source_id,
        name: response.name,
        code: response.code,
        street: response.street,
        number: response.number,
        postalCode: response.postal_code,
        city: response.city,
        country: response.country,
        phone1: response.phone_1,
        phone2: response.phone_2,
        isOwnedByViernulvier: response.is_owned_by_viernulvier,
        uitdatabankId: response.uitdatabank_id,
    };

    return {
        ...location,
        address: buildAddress(location),
    };
};

export const mapLocations = (response: LocationResponse[]): Location[] => response.map(mapLocation);

export const mapCreateLocationInput = (input: LocationCreateInput): LocationCreateRequest => {
    return {
        source_id: input.sourceId,
        name: input.name,
        code: input.code,
        street: input.street,
        number: input.number,
        postal_code: input.postalCode,
        city: input.city,
        country: input.country,
        phone_1: input.phone1,
        phone_2: input.phone2,
        is_owned_by_viernulvier: input.isOwnedByViernulvier,
        uitdatabank_id: input.uitdatabankId,
    };
};

export const mapUpdateLocationInput = (input: LocationUpdateInput): LocationUpdateRequest => {
    return {
        ...mapCreateLocationInput(input),
        id: input.id,
    };
};
