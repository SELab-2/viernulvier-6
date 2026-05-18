import { PaginationParams, SearchPaginationParams } from "@/types/api/api.types";
import { EntityMediaParams, MediaSearchParams } from "@/types/models/media.types";
import { ImportRowsParams, ImportSessionsParams } from "@/types/models/import.types";
import { ProductionSearchParams } from "@/types/models/production.types";
import { CollectionVisibility } from "@/types/models/collection.types";

type QueryKeyParams = PaginationParams | ProductionSearchParams | Record<string, unknown>;

const buildQueryKey = (base: readonly string[], params?: QueryKeyParams): readonly unknown[] => {
    if (!params || Object.keys(params).length === 0) return base;
    return [...base, params];
};

export const queryKeys = {
    user: ["user"] as const,
    version: ["version"] as const,
    stats: ["stats"] as const,
    importErrors: {
        all: (pagination?: PaginationParams, resolved?: boolean) =>
            buildQueryKey(["import-errors"], { ...pagination, resolved: resolved ?? false }),
    },
    locations: {
        all: (pagination?: SearchPaginationParams) =>
            buildQueryKey(queryKeys.locations.root, pagination),
        root: ["locations"] as const,
        infinite: (params?: Omit<PaginationParams, "cursor">) =>
            params
                ? ([...queryKeys.locations.root, "infinite", params] as const)
                : ([...queryKeys.locations.root, "infinite"] as const),
        detail: (id: string) => [...queryKeys.locations.root, id] as const,
        bySlug: (slug: string) => [...queryKeys.locations.root, "slug", slug] as const,
    },
    productions: {
        all: (params?: ProductionSearchParams) => buildQueryKey(["productions"], params),
        detail: (id: string) => ["productions", id] as const,
        infinite: (params?: Omit<ProductionSearchParams, "cursor">) =>
            params
                ? (["productions", "infinite", params] as const)
                : (["productions", "infinite"] as const),
        events: (id: string) => ["productions", id, "events"] as const,
    },
    collections: {
        all: ["collections"] as const,
        detail: (id: string) => ["collections", id] as const,
        bySlug: (slug: string) => ["collections", "slug", slug] as const,
        forProduction: (id: string, visibility?: CollectionVisibility) =>
            visibility
                ? (["collections", "production", id, visibility] as const)
                : (["collections", "production", id] as const),
        cmsInfinite: (params?: Record<string, unknown>) =>
            params
                ? (["collections", "cms", "infinite", params] as const)
                : (["collections", "cms", "infinite"] as const),
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
        list: (params?: { q?: string }) =>
            params?.q ? (["artists", "list", params] as const) : (["artists", "list"] as const),
        infinite: (params?: { q?: string; limit?: number }) =>
            params?.q || params?.limit
                ? (["artists", "infinite", params] as const)
                : (["artists", "infinite"] as const),
        detail: (id: string) => ["artists", id] as const,
        productions: (id: string) => ["artists", id, "productions"] as const,
        byProduction: (id: string) => ["artists", "byProduction", id] as const,
    },
    articles: {
        all: ["articles"] as const,
        list: (pagination?: PaginationParams) =>
            buildQueryKey([...queryKeys.articles.all, "list"], pagination),
        infinite: (pagination?: Omit<SearchPaginationParams, "cursor">) =>
            buildQueryKey([...queryKeys.articles.all, "infinite"], pagination),
        detail: (id: string) => [...queryKeys.articles.all, id] as const,
        relations: (id: string) => [...queryKeys.articles.all, id, "relations"] as const,
        published: ["articles", "published"] as const,
        bySlug: (slug: string) => [...queryKeys.articles.all, "bySlug", slug] as const,
        byProduction: (id: string) => ["articles", "byProduction", id] as const,
        cmsInfinite: (params?: Omit<PaginationParams, "cursor">) =>
            params
                ? (["articles", "cms", "infinite", params] as const)
                : (["articles", "cms", "infinite"] as const),
    },
    media: {
        all: (params?: MediaSearchParams) =>
            params ? (["media", params] as const) : (["media"] as const),
        infinite: (params?: Omit<MediaSearchParams, "cursor">) =>
            params ? (["media", "infinite", params] as const) : (["media", "infinite"] as const),
        detail: (id: string) => ["media", id] as const,
        entityLinks: (id: string | null) =>
            id ? (["media", id, "entities"] as const) : (["media", "entities"] as const),
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
        entityTags: (entityType: string, entityId: string) =>
            ["taxonomy", "entity-tags", entityType, entityId] as const,
    },
    imports: {
        all: ["imports"] as const,
        sessions: (params?: ImportSessionsParams) =>
            params
                ? (["imports", "sessions", params] as const)
                : (["imports", "sessions"] as const),
        session: (id: string) => ["imports", "sessions", id] as const,
        rows: (sessionId: string, params?: ImportRowsParams) =>
            params
                ? (["imports", "sessions", sessionId, "rows", params] as const)
                : (["imports", "sessions", sessionId, "rows"] as const),
        rowStats: (sessionId: string) => ["imports", "sessions", sessionId, "stats"] as const,
        fieldSpec: (entityType: string) => ["imports", "fields", entityType] as const,
        entityTypes: ["imports", "entity-types"] as const,
    },
    users: {
        all: () => ["users"] as const,
    },
};
