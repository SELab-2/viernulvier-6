import {
    Facet,
    FacetSlug,
    FacetTranslation,
    Tag,
    TagTranslation,
} from "@/types/models/taxonomy.types";

// NOTE: these local API types match the new backend shape.
// Re-run `npm run generate:api-types` from the frontend/ directory after the
// backend migration is applied to regenerate frontend/src/types/api/generated.ts.

type ApiTagTranslation = {
    label: string;
    description?: string | null;
};

type ApiTagResponse = {
    slug: string;
    sort_order: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translations: Record<string, ApiTagTranslation> | any;
};

type ApiFacetTranslation = {
    label: string;
};

type ApiFacetResponse = {
    slug: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translations: Record<string, ApiFacetTranslation> | any;
    tags: ApiTagResponse[];
};

const mapTagTranslation = (t: ApiTagTranslation): TagTranslation => ({
    label: t.label,
    description: t.description ?? null,
});

const mapFacetTranslation = (t: ApiFacetTranslation): FacetTranslation => ({
    label: t.label,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapTag = (response: ApiTagResponse | any): Tag => ({
    slug: response.slug,
    sortOrder: response.sort_order,
    translations: Object.fromEntries(
        Object.entries(response.translations ?? {}).map(([lang, t]) => [
            lang,
            mapTagTranslation(t as ApiTagTranslation),
        ])
    ),
});

export const mapTags = (response: ApiTagResponse[]): Tag[] => response.map(mapTag);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapFacet = (response: ApiFacetResponse | any): Facet => ({
    slug: response.slug as FacetSlug,
    translations: Object.fromEntries(
        Object.entries(response.translations ?? {}).map(([lang, t]) => [
            lang,
            mapFacetTranslation(t as ApiFacetTranslation),
        ])
    ),
    tags: mapTags(response.tags),
});

export const mapFacets = (response: ApiFacetResponse[]): Facet[] => response.map(mapFacet);
