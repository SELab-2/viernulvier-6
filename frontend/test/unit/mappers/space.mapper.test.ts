import { describe, expect, it } from "vitest";

import { mapCreateSpaceInput, mapSpace, mapUpdateSpaceInput } from "@/mappers/space.mapper";

describe("space mapper", () => {
    it("maps space response to domain model", () => {
        const mapped = mapSpace({
            id: "cb74aa4f-6856-4a8b-9930-2a8c56ec3333",
            source_id: undefined,
            name_nl: "Main Space",
            location_id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
        });

        expect(mapped).toEqual({
            id: "cb74aa4f-6856-4a8b-9930-2a8c56ec3333",
            sourceId: null,
            nameNl: "Main Space",
            locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
        });
    });

    it("maps create and update inputs", () => {
        expect(
            mapCreateSpaceInput({
                nameNl: "Space",
                locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            })
        ).toEqual({
            source_id: undefined,
            name_nl: "Space",
            location_id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
        });

        expect(
            mapUpdateSpaceInput({
                id: "id-1",
                nameNl: "Space",
                locationId: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
            }).id
        ).toBe("id-1");
    });
});
