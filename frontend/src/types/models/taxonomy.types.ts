export type EntityType = "production" | "artist" | "article" | "media";

export type FacetSlug = "discipline" | "format" | "theme" | "audience";

export type TagTranslation = {
    languageCode: string;
    label: string;
    description: string | null;
};

export type FacetTranslation = {
    languageCode: string;
    label: string;
};

export type Tag = {
    slug: string;
    sortOrder: number;
    translations: TagTranslation[];
};

export type Facet = {
    slug: FacetSlug;
    translations: FacetTranslation[];
    tags: Tag[];
};
