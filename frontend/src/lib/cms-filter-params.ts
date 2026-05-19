import type { FacetSlug } from "@/types/models/taxonomy.types";

export const CMS_FACET_PARAM_KEYS = [
    "discipline",
    "format",
    "theme",
    "audience",
    "accessibility",
    "language",
] as const satisfies readonly FacetSlug[];

export type CmsFacetParams = Partial<Record<(typeof CMS_FACET_PARAM_KEYS)[number], string>>;

export function getCmsFacetParams(searchParams: URLSearchParams): CmsFacetParams {
    const params: CmsFacetParams = {};

    for (const key of CMS_FACET_PARAM_KEYS) {
        const value = searchParams.get(key);
        if (value) params[key] = value;
    }

    return params;
}
