export type EntityType = "production" | "artist" | "article" | "media";

export type FacetSlug = "discipline" | "format" | "theme" | "audience";

export type TagTranslation = {
    label: string;
    description: string | null;
};

export type FacetTranslation = {
    label: string;
};

export type Tag = {
    slug: string;
    sortOrder: number;
    /** Translations keyed by language code, e.g. "nl" or "en". */
    translations: Record<string, TagTranslation>;
};

export type Facet = {
    slug: FacetSlug;
    /** Translations keyed by language code, e.g. "nl" or "en". */
    translations: Record<string, FacetTranslation>;
    tags: Tag[];
};
