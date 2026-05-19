import { describe, expect, it } from "vitest";

import { filterProductionsByArchiveFilters } from "@/components/searchpage/filterProductionsByArchiveFilters";
import type { Event } from "@/types/models/event.types";
import type { Production } from "@/types/models/production.types";

const production = (id: string): Production => ({
    id,
    sourceId: null,
    slug: `production-${id}`,
    video1: null,
    video2: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: null,
    translations: [],
    coverImageUrl: null,
});

const event = (id: string, productionId: string, startsAt: string): Event => ({
    id,
    sourceId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    startsAt,
    endsAt: null,
    intermissionAt: null,
    doorsAt: null,
    vendorId: null,
    boxOfficeId: null,
    uitdatabankId: null,
    maxTicketsPerOrder: null,
    productionId,
    status: "published",
    hallId: null,
    prices: [],
});

describe("filterProductionsByArchiveFilters", () => {
    it("returns no productions when the production category is disabled", () => {
        const result = filterProductionsByArchiveFilters([production("p1")], undefined, {
            categories: new Set(["articles"]),
            dateRange: [new Date("2020-01-01"), new Date("2020-12-31")],
        });

        expect(result).toEqual([]);
    });

    it("keeps all productions when no date filter is active", () => {
        const result = filterProductionsByArchiveFilters(
            [production("p1"), production("p2")],
            [],
            {
                categories: new Set(["productions"]),
                dateRange: [new Date("1980-01-01"), new Date("2026-12-31")],
            },
            { hasActiveDateFilter: false }
        );

        expect(result.map((item) => item.id)).toEqual(["p1", "p2"]);
    });

    it("filters productions to those with an event inside the selected year range", () => {
        const result = filterProductionsByArchiveFilters(
            [production("p1"), production("p2")],
            [event("e1", "p1", "2020-05-10T20:00:00Z"), event("e2", "p2", "1999-05-10T20:00:00Z")],
            {
                categories: new Set(["productions"]),
                dateRange: [new Date("2020-01-01"), new Date("2020-12-31T23:59:59.999Z")],
            },
            { hasActiveDateFilter: true }
        );

        expect(result.map((item) => item.id)).toEqual(["p1"]);
    });
});
