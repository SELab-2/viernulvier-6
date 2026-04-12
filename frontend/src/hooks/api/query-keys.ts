import { PaginationParams } from "@/types/api/api.types";
import { EntityMediaParams } from "@/types/models/media.types";

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
        bySlug: (slug: string) => ["locations", "slug", slug] as const,
    },
    productions: {
        all: (pagination?: PaginationParams) => buildQueryKey(["productions"], pagination),
        detail: (id: string) => ["productions", id] as const,
        events: (id: string) => ["productions", id, "events"] as const,
    },
    collections: {
        all: ["collections"] as const,
        detail: (id: string) => ["collections", id] as const,
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
    artists: {
        all: ["artists"] as const,
    },
    articles: {
        all: ["articles"] as const,
        detail: (id: string) => ["articles", id] as const,
        relations: (id: string) => ["articles", id, "relations"] as const,
        published: ["articles", "published"] as const,
        bySlug: (slug: string) => ["articles", "bySlug", slug] as const,
    },
    media: {
        all: (params?: { limit?: number; offset?: number }) =>
            params ? (["media", params] as const) : (["media"] as const),
        detail: (id: string) => ["media", id] as const,
        entity: (entityType: string, entityId: string, params?: EntityMediaParams) =>
            params
                ? (["media", "entity", entityType, entityId, params] as const)
                : (["media", "entity", entityType, entityId] as const),
    },
    taxonomy: {
        facets: (entityType?: string) =>
            entityType
                ? (["taxonomy", "facets", entityType] as const)
                : (["taxonomy", "facets"] as const),
    },
};
