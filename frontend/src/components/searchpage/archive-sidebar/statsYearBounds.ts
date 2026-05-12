import type { StatsPayload } from "@/types/api/stats.api.types";

const FALLBACK_MIN_YEAR = 1980;

function currentYear(): number {
    return new Date().getFullYear();
}

/**
 * Inclusive calendar years for the archive filter, derived from the min of
 * oldest_event/oldest_article and max of newest_event/newest_article in GET /stats.
 * Props are used only as fallback when stats haven't loaded yet.
 */
export function yearBoundsFromStats(
    stats: StatsPayload | undefined,
    opts?: { minYear?: number; maxYear?: number }
): { minYear: number; maxYear: number } {
    const fallbackMax = currentYear();

    let minY: number;
    let maxY: number;

    if (stats) {
        const minCandidates = [
            stats.oldest_event ? new Date(stats.oldest_event).getFullYear() : null,
            stats.oldest_article ? new Date(stats.oldest_article).getFullYear() : null,
        ].filter((y): y is number => Number.isFinite(y));

        const maxCandidates = [
            stats.newest_event ? new Date(stats.newest_event).getFullYear() : null,
            stats.newest_article ? new Date(stats.newest_article).getFullYear() : null,
        ].filter((y): y is number => Number.isFinite(y));

        minY =
            minCandidates.length > 0
                ? Math.min(...minCandidates)
                : (opts?.minYear ?? FALLBACK_MIN_YEAR);
        maxY =
            maxCandidates.length > 0 ? Math.max(...maxCandidates) : (opts?.maxYear ?? fallbackMax);
    } else {
        minY = opts?.minYear ?? FALLBACK_MIN_YEAR;
        maxY = opts?.maxYear ?? fallbackMax;
    }

    if (!Number.isFinite(minY)) minY = FALLBACK_MIN_YEAR;
    if (!Number.isFinite(maxY)) maxY = fallbackMax;

    if (minY > maxY) [minY, maxY] = [maxY, minY];
    if (minY === maxY) maxY = minY + 1;

    return { minYear: minY, maxYear: maxY };
}
