import { FacetResponse, TagResponse } from "@/types/api/taxonomy.api.types";
import {
    Facet,
    FacetSlug,
    FacetTranslation,
    Tag,
    TagTranslation,
} from "@/types/models/taxonomy.types";

const mapTagTranslation = (t: TagResponse["translations"][number]): TagTranslation => ({
    languageCode: t.language_code,
    label: t.label,
    description: t.description ?? null,
});

const mapFacetTranslation = (t: FacetResponse["translations"][number]): FacetTranslation => ({
    languageCode: t.language_code,
    label: t.label,
});

export const mapTag = (response: TagResponse): Tag => ({
    slug: response.slug,
    sortOrder: response.sort_order,
    translations: response.translations.map(mapTagTranslation),
});

export const mapTags = (response: TagResponse[]): Tag[] => response.map(mapTag);

export const mapFacet = (response: FacetResponse): Facet => ({
    slug: response.slug as FacetSlug,
    translations: response.translations.map(mapFacetTranslation),
    tags: mapTags(response.tags),
});

export const mapFacets = (response: FacetResponse[]): Facet[] => response.map(mapFacet);
