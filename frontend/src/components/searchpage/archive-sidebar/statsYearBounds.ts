import type { StatsPayload } from "@/types/api/stats.api.types";

const FALLBACK_MIN_YEAR = 1980;

function currentYear(): number {
    return new Date().getFullYear();
}

/**
 * Inclusive calendar years for the archive filter, from GET /stats event bounds
 * (optional prop overrides for tests).
 */
export function yearBoundsFromStats(
    stats: StatsPayload | undefined,
    opts?: { minYear?: number; maxYear?: number }
): { minYear: number; maxYear: number } {
    const fallbackMax = currentYear();

    let minY =
        opts?.minYear !== undefined
            ? opts.minYear
            : stats?.oldest_event
              ? new Date(stats.oldest_event).getFullYear()
              : FALLBACK_MIN_YEAR;

    let maxY =
        opts?.maxYear !== undefined
            ? opts.maxYear
            : stats?.newest_event
              ? new Date(stats.newest_event).getFullYear()
              : fallbackMax;

    if (!Number.isFinite(minY)) minY = FALLBACK_MIN_YEAR;
    if (!Number.isFinite(maxY)) maxY = fallbackMax;

    if (minY > maxY) {
        [minY, maxY] = [maxY, minY];
    }
    if (minY === maxY) {
        maxY = minY + 1;
    }

    return { minYear: minY, maxYear: maxY };
}
