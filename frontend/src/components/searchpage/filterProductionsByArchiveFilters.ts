import type { Event } from "@/types/models/event.types";
import type { Production } from "@/types/models/production.types";

export type ArchiveFilters = {
    categories: Set<string>;
    dateRange: [Date, Date];
};

export function filterProductionsByArchiveFilters(
    productions: Production[],
    events: Event[] | undefined,
    filters: ArchiveFilters,
    options?: { hasActiveDateFilter?: boolean }
): Production[] {
    if (!filters.categories.has("productions")) {
        return [];
    }

    if (!options?.hasActiveDateFilter) {
        return productions;
    }

    if (!events) {
        return productions;
    }

    const start = filters.dateRange[0].getTime();
    const end = filters.dateRange[1].getTime();

    const matchingProductionIds = new Set(
        events
            .filter((event) => {
                const startsAt = new Date(event.startsAt).getTime();
                return Number.isFinite(startsAt) && startsAt >= start && startsAt <= end;
            })
            .map((event) => event.productionId)
    );

    return productions.filter((production) => matchingProductionIds.has(production.id));
}
