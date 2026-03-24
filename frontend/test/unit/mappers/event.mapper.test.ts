import { describe, expect, it } from "vitest";

import { mapCreateEventInput, mapEvent, mapUpdateEventInput } from "@/mappers/event.mapper";

describe("event mapper", () => {
    it("maps response and normalizes optional fields to null", () => {
        const mapped = mapEvent({
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            source_id: undefined,
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
            starts_at: "2025-06-15T20:00:00Z",
            ends_at: undefined,
            intermission_at: null,
            doors_at: "2025-06-15T19:00:00Z",
            vendor_id: undefined,
            box_office_id: undefined,
            uitdatabank_id: undefined,
            max_tickets_per_order: undefined,
            production_id: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            status: "available",
            hall_id: undefined,
        });

        expect(mapped.sourceId).toBeNull();
        expect(mapped.endsAt).toBeNull();
        expect(mapped.intermissionAt).toBeNull();
        expect(mapped.doorsAt).toBe("2025-06-15T19:00:00Z");
        expect(mapped.vendorId).toBeNull();
        expect(mapped.boxOfficeId).toBeNull();
        expect(mapped.uitdatabankId).toBeNull();
        expect(mapped.maxTicketsPerOrder).toBeNull();
        expect(mapped.hallId).toBeNull();
        expect(mapped.startsAt).toBe("2025-06-15T20:00:00Z");
        expect(mapped.productionId).toBe("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");
        expect(mapped.status).toBe("available");
    });

    it("maps create input to api payload", () => {
        const createPayload = mapCreateEventInput({
            startsAt: "2025-06-15T20:00:00Z",
            productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            status: "available",
        });

        expect(createPayload.starts_at).toBe("2025-06-15T20:00:00Z");
        expect(createPayload.production_id).toBe("4f327f95-3a64-4fc0-8f6a-a9dc44c01111");
        expect(createPayload.status).toBe("available");
        expect(createPayload.created_at).toBeDefined();
        expect(createPayload.updated_at).toBeDefined();
    });

    it("maps update input to api payload with id", () => {
        const updatePayload = mapUpdateEventInput({
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            startsAt: "2025-06-15T20:00:00Z",
            productionId: "4f327f95-3a64-4fc0-8f6a-a9dc44c01111",
            status: "available",
        });

        expect(updatePayload.id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        expect(updatePayload.starts_at).toBe("2025-06-15T20:00:00Z");
    });
});
