export const queryKeys = {
    user: ["user"] as const,
    version: ["version"] as const,
    locations: {
        all: ["locations"] as const,
        detail: (id: string) => ["locations", id] as const,
    },
    productions: {
        all: ["productions"] as const,
        detail: (id: string) => ["productions", id] as const,
    },
    halls: {
        all: ["halls"] as const,
        detail: (id: string) => ["halls", id] as const,
    },
    spaces: {
        all: ["spaces"] as const,
        detail: (id: string) => ["spaces", id] as const,
    },
};
