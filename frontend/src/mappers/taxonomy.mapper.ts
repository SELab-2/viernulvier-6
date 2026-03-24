import {
    Facet,
    FacetSlug,
    FacetTranslation,
    Tag,
    TagTranslation,
} from "@/types/models/taxonomy.types";

type ApiTagTranslation = {
    language_code: string;
    label: string;
    description?: string | null;
};

type ApiTagResponse = {
    slug: string;
    sort_order: number;
    translations: ApiTagTranslation[];
};

type ApiFacetTranslation = {
    language_code: string;
    label: string;
};

type ApiFacetResponse = {
    slug: string;
    translations: ApiFacetTranslation[];
    tags: ApiTagResponse[];
};

const mapTagTranslation = (t: ApiTagTranslation): TagTranslation => ({
    languageCode: t.language_code,
    label: t.label,
    description: t.description ?? null,
});

const mapFacetTranslation = (t: ApiFacetTranslation): FacetTranslation => ({
    languageCode: t.language_code,
    label: t.label,
});

export const mapTag = (response: ApiTagResponse): Tag => ({
    slug: response.slug,
    sortOrder: response.sort_order,
    translations: response.translations.map(mapTagTranslation),
});

export const mapTags = (response: ApiTagResponse[]): Tag[] => response.map(mapTag);

export const mapFacet = (response: ApiFacetResponse): Facet => ({
    slug: response.slug as FacetSlug,
    translations: response.translations.map(mapFacetTranslation),
    tags: mapTags(response.tags),
});

export const mapFacets = (response: ApiFacetResponse[]): Facet[] => response.map(mapFacet);
