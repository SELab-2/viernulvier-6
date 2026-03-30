import { PaginationParams } from "@/types/api/api.types";

const buildQueryKey = (
    base: readonly string[],
    pagination?: PaginationParams
): readonly unknown[] => {
    if (!pagination) return base;
    return [...base, pagination];
};

export const queryKeys = {
    user: ["user"] as const,
    version: ["version"] as const,
    locations: {
        all: (pagination?: PaginationParams) => buildQueryKey(["locations"], pagination),
        detail: (id: string) => ["locations", id] as const,
    },
    productions: {
        all: (pagination?: PaginationParams) => buildQueryKey(["productions"], pagination),
        detail: (id: string) => ["productions", id] as const,
        events: (id: string) => ["productions", id, "events"] as const,
    },
    events: {
        all: (pagination?: PaginationParams) => buildQueryKey(["events"], pagination),
        detail: (id: string) => ["events", id] as const,
    },
    halls: {
        all: (pagination?: PaginationParams) => buildQueryKey(["halls"], pagination),
        detail: (id: string) => ["halls", id] as const,
    },
    spaces: {
        all: (pagination?: PaginationParams) => buildQueryKey(["spaces"], pagination),
        detail: (id: string) => ["spaces", id] as const,
    },
    taxonomy: {
        facets: (entityType?: string) =>
            entityType
                ? (["taxonomy", "facets", entityType] as const)
                : (["taxonomy", "facets"] as const),
    },
};
