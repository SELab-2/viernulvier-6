import {
    LocationCreateRequest,
    LocationResponse,
    LocationTranslationResponse,
    LocationUpdateRequest,
    PaginatedLocationResponse,
} from "@/types/api/location.api.types";
import { PaginatedResult } from "@/types/api/api.types";
import {
    Location,
    LocationCreateInput,
    LocationTranslation,
    LocationTranslationInput,
    LocationUpdateInput,
} from "@/types/models/location.types";

import { toNullable } from "./utils";

const mapLocationTranslation = (t: LocationTranslationResponse): LocationTranslation => ({
    languageCode: t.language_code,
    description: toNullable(t.description),
    history: toNullable(t.history),
});

const mapTranslationInput = (t: LocationTranslationInput): LocationTranslationResponse => ({
    language_code: t.languageCode,
    description: t.description,
    history: t.history,
});

const buildAddress = (
    location: Pick<Location, "street" | "number" | "postalCode" | "city" | "country">
): string => {
    const lineOne = [location.street, location.number].filter(Boolean).join(" ");
    const lineTwo = [location.postalCode, location.city].filter(Boolean).join(" ");

    return [lineOne, lineTwo, location.country].filter(Boolean).join(", ");
};

export const mapLocation = (response: LocationResponse): Location => {
    const location: Omit<Location, "address" | "translations"> = {
        id: response.id,
        sourceId: toNullable(response.source_id),
        slug: toNullable(response.slug),
        name: toNullable(response.name),
        code: toNullable(response.code),
        street: toNullable(response.street),
        number: toNullable(response.number),
        postalCode: toNullable(response.postal_code),
        city: toNullable(response.city),
        country: toNullable(response.country),
        phone1: toNullable(response.phone_1),
        phone2: toNullable(response.phone_2),
        isOwnedByViernulvier: toNullable(response.is_owned_by_viernulvier),
        uitdatabankId: toNullable(response.uitdatabank_id),
    };

    return {
        ...location,
        address: buildAddress(location),
        translations: (response.translations ?? []).map(mapLocationTranslation),
    };
};

export const mapLocations = (response: LocationResponse[]): Location[] => response.map(mapLocation);

export const mapPaginatedLocations = (response: PaginatedLocationResponse): Location[] =>
    mapLocations(response.data);

export const mapPaginatedLocationsResult = (
    response: PaginatedLocationResponse
): PaginatedResult<Location> => ({
    data: mapLocations(response.data),
    nextCursor: response.next_cursor ?? null,
});

export const mapCreateLocationInput = (input: LocationCreateInput): LocationCreateRequest => {
    return {
        source_id: input.sourceId,
        slug: input.slug,
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
        translations: (input.translations ?? []).map(mapTranslationInput),
    };
};

export const mapUpdateLocationInput = (input: LocationUpdateInput): LocationUpdateRequest => {
    return {
        ...mapCreateLocationInput(input),
        id: input.id,
    };
};
