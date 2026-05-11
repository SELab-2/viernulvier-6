import { useMemo } from "react";

import { useGetFacets } from "@/hooks/api/useTaxonomy";

export type TaxonomyLookupEntry = {
    label: string;
    facet: string;
    sortOrder: number;
    facetSortIndex: number;
};

export type TaxonomyLookup = Map<string, TaxonomyLookupEntry>;

const otherLocale = (locale: string): string => (locale === "nl" ? "en" : "nl");

export function useTaxonomyLookup(locale: string): TaxonomyLookup {
    const { data: facets } = useGetFacets();

    return useMemo<TaxonomyLookup>(() => {
        const map: TaxonomyLookup = new Map();
        if (!facets) return map;

        const fallback = otherLocale(locale);

        facets.forEach((facet, facetSortIndex) => {
            for (const tag of facet.tags) {
                const current = tag.translations.find((t) => t.languageCode === locale)?.label;
                const other = tag.translations.find((t) => t.languageCode === fallback)?.label;
                map.set(tag.slug, {
                    label: current ?? other ?? tag.slug,
                    facet: facet.slug,
                    sortOrder: tag.sortOrder,
                    facetSortIndex,
                });
            }
        });

        return map;
    }, [facets, locale]);
}
