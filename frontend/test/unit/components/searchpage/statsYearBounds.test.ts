import { describe, expect, it } from "vitest";
import { yearBoundsFromStats } from "@/components/searchpage/archive-sidebar/statsYearBounds";
import type { StatsPayload } from "@/types/api/stats.api.types";

const base: StatsPayload = {
    event_count: 0,
    production_count: 0,
    location_count: 0,
    article_count: 0,
    artist_count: 0,
    collection_count: 0,
    media_count: 0,
};

describe("yearBoundsFromStats", () => {
    it("uses props as fallback when stats is undefined", () => {
        expect(yearBoundsFromStats(undefined, { minYear: 1990, maxYear: 2010 })).toEqual({
            minYear: 1990,
            maxYear: 2010,
        });
    });

    it("uses FALLBACK_MIN_YEAR and current year when stats undefined and no props", () => {
        const { minYear, maxYear } = yearBoundsFromStats(undefined);
        expect(minYear).toBe(1980);
        expect(maxYear).toBe(new Date().getFullYear());
    });

    it("uses event bounds when only events present", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_event: "2010-01-01T00:00:00Z",
            newest_event: "2022-12-31T00:00:00Z",
        };
        expect(yearBoundsFromStats(stats)).toEqual({ minYear: 2010, maxYear: 2022 });
    });

    it("uses article bounds when only articles present", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_article: "2005-06-15",
            newest_article: "2025-03-01",
        };
        expect(yearBoundsFromStats(stats)).toEqual({ minYear: 2005, maxYear: 2025 });
    });

    it("takes min of oldest_event and oldest_article for minYear", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_event: "2010-01-01T00:00:00Z",
            newest_event: "2022-12-31T00:00:00Z",
            oldest_article: "2003-01-01",
            newest_article: "2021-01-01",
        };
        expect(yearBoundsFromStats(stats).minYear).toBe(2003);
    });

    it("takes max of newest_event and newest_article for maxYear", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_event: "2010-01-01T00:00:00Z",
            newest_event: "2022-12-31T00:00:00Z",
            oldest_article: "2012-01-01",
            newest_article: "2026-06-01",
        };
        expect(yearBoundsFromStats(stats).maxYear).toBe(2026);
    });

    it("ignores props once stats is defined", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_event: "2015-01-01T00:00:00Z",
            newest_event: "2020-01-01T00:00:00Z",
        };
        expect(yearBoundsFromStats(stats, { minYear: 1980, maxYear: 2099 })).toEqual({
            minYear: 2015,
            maxYear: 2020,
        });
    });

    it("falls back to props when stats has no bounds at all", () => {
        expect(yearBoundsFromStats(base, { minYear: 1990, maxYear: 2010 })).toEqual({
            minYear: 1990,
            maxYear: 2010,
        });
    });

    it("ensures maxYear is at least minYear + 1 when they are equal", () => {
        const stats: StatsPayload = {
            ...base,
            oldest_event: "2020-06-01T00:00:00Z",
            newest_event: "2020-06-01T00:00:00Z",
        };
        const { minYear, maxYear } = yearBoundsFromStats(stats);
        expect(minYear).toBe(2020);
        expect(maxYear).toBe(2021);
    });
});
