import { describe, expect, it } from "vitest";

import {
    mapCreateLocationInput,
    mapLocation,
    mapUpdateLocationInput,
} from "@/mappers/location.mapper";

describe("location mapper", () => {
    it("maps location response to domain model and computes address", () => {
        const mapped = mapLocation({
            id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            source_id: undefined,
            name: "Main Venue",
            code: "MV",
            street: "Mainstraat",
            number: "12",
            postal_code: "9000",
            city: "Gent",
            country: "Belgium",
            phone_1: "+32-9-000-00-00",
            phone_2: undefined,
            is_owned_by_viernulvier: true,
            uitdatabank_id: undefined,
        });

        expect(mapped).toEqual({
            id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            sourceId: null,
            name: "Main Venue",
            code: "MV",
            street: "Mainstraat",
            number: "12",
            postalCode: "9000",
            city: "Gent",
            country: "Belgium",
            phone1: "+32-9-000-00-00",
            phone2: null,
            isOwnedByViernulvier: true,
            uitdatabankId: null,
            address: "Mainstraat 12, 9000 Gent, Belgium",
        });
    });

    it("maps create and update inputs to API payloads", () => {
        const createPayload = mapCreateLocationInput({
            name: "Venue",
            city: "Gent",
            phone1: null,
        });

        expect(createPayload).toEqual({
            source_id: undefined,
            name: "Venue",
            code: undefined,
            street: undefined,
            number: undefined,
            postal_code: undefined,
            city: "Gent",
            country: undefined,
            phone_1: null,
            phone_2: undefined,
            is_owned_by_viernulvier: undefined,
            uitdatabank_id: undefined,
        });

        const updatePayload = mapUpdateLocationInput({ id: "id-1", name: "Updated" });
        expect(updatePayload).toEqual({
            id: "id-1",
            source_id: undefined,
            name: "Updated",
            code: undefined,
            street: undefined,
            number: undefined,
            postal_code: undefined,
            city: undefined,
            country: undefined,
            phone_1: undefined,
            phone_2: undefined,
            is_owned_by_viernulvier: undefined,
            uitdatabank_id: undefined,
        });
    });
});
