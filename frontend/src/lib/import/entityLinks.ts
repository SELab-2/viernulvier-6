export function cmsEditUrl(entityType: string, id: string): string {
    switch (entityType) {
        case "production":
            return `/cms/productions/${id}/edit`;
        case "event":
            return `/cms/events/${id}/edit`;
        case "article":
            return `/cms/articles/${id}/edit`;
        case "location":
            return `/cms/locations/${id}/edit`;
        case "artist":
            return `/cms/performers/${id}/edit`;
        default:
            throw new Error(`Unknown entity type ${entityType}`);
    }
}

export function publicSiteUrl(entityType: string, slug: string | null): string | null {
    if (slug === null) {
        return null;
    }
    switch (entityType) {
        case "production":
            return `/productions/${slug}`;
        case "article":
            return `/articles/${slug}`;
        case "location":
            return `/locations/${slug}`;
        default:
            return null;
    }
}
