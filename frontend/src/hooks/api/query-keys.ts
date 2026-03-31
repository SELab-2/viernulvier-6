export const queryKeys = {
    user: ["user"] as const,
    version: ["version"] as const,
    locations: {
        all: ["locations"] as const,
        detail: (id: string) => ["locations", id] as const,
        bySlug: (slug: string) => ["locations", "slug", slug] as const,
    },
    productions: {
        all: ["productions"] as const,
        detail: (id: string) => ["productions", id] as const,
        events: (id: string) => ["productions", id, "events"] as const,
    },
    events: {
        all: ["events"] as const,
        detail: (id: string) => ["events", id] as const,
    },
    halls: {
        all: ["halls"] as const,
        detail: (id: string) => ["halls", id] as const,
    },
    spaces: {
        all: ["spaces"] as const,
        detail: (id: string) => ["spaces", id] as const,
    },
    taxonomy: {
        facets: (entityType?: string) =>
            entityType
                ? (["taxonomy", "facets", entityType] as const)
                : (["taxonomy", "facets"] as const),
    },
};
