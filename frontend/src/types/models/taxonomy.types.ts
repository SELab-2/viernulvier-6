export type EntityType = "production" | "artist" | "article" | "media";

export type FacetSlug = "discipline" | "format" | "theme" | "audience";

export type Tag = {
    slug: string;
    label: string;
    sortOrder: number;
};

export type Facet = {
    slug: FacetSlug;
    label: string;
    tags: Tag[];
};
