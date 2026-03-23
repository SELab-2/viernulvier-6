import { FacetResponse, TagResponse } from "@/types/api/taxonomy.api.types";
import { Facet, FacetSlug, Tag } from "@/types/models/taxonomy.types";

export const mapTag = (response: TagResponse): Tag => {
    return {
        slug: response.slug,
        label: response.label,
        sortOrder: response.sort_order,
    };
};

export const mapTags = (response: TagResponse[]): Tag[] => response.map(mapTag);

export const mapFacet = (response: FacetResponse): Facet => {
    return {
        slug: response.slug as FacetSlug,
        label: response.label,
        tags: mapTags(response.tags),
    };
};

export const mapFacets = (response: FacetResponse[]): Facet[] => response.map(mapFacet);
