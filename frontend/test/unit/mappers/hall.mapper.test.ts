import { describe, expect, it } from "vitest";

import { mapCreateHallInput, mapHall, mapUpdateHallInput } from "@/mappers/hall.mapper";

describe("hall mapper", () => {
    it("maps hall response to domain model with null normalization", () => {
        const mapped = mapHall({
            id: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
            source_id: undefined,
            vendor_id: undefined,
            box_office_id: "box",
            seat_selection: undefined,
            open_seating: false,
            name: "Big Hall",
            remark: undefined,
            slug: "big-hall",
            space_id: undefined,
        });

        expect(mapped).toEqual({
            id: "d30f5f95-3a64-4fc0-8f6a-a9dc44c02222",
            sourceId: null,
            vendorId: null,
            boxOfficeId: "box",
            seatSelection: null,
            openSeating: false,
            name: "Big Hall",
            remark: null,
            slug: "big-hall",
            spaceId: null,
        });
    });

    it("maps create/update hall payloads", () => {
        expect(mapCreateHallInput({ slug: "h", name: "Hall" })).toEqual({
            source_id: undefined,
            slug: "h",
            vendor_id: undefined,
            box_office_id: undefined,
            seat_selection: undefined,
            open_seating: undefined,
            name: "Hall",
            remark: undefined,
            space_id: undefined,
        });

        expect(mapUpdateHallInput({ id: "id-1", slug: "h", name: "Hall" }).id).toBe("id-1");
    });
});
