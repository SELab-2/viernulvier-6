"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FacetCombobox } from "@/components/cms/facet-combobox";
import { TagManagementSheet } from "@/components/cms/tag-management-sheet";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { EntityType, Facet } from "@/types/models/taxonomy.types";

interface TagPickerSectionProps {
    entityType: EntityType;
    selectedSlugs: string[];
    inheritedSlugs?: string[];
    onChange: (slugs: string[]) => void;
    compact?: boolean;
}

export function TagPickerSection({
    entityType,
    selectedSlugs,
    inheritedSlugs = [],
    onChange,
    compact = false,
}: TagPickerSectionProps) {
    const t = useTranslations("Cms.Tags");
    const locale = useLocale();
    const { data: facets, isLoading } = useGetFacets({ entityType });

    const [manageState, setManageState] = React.useState<{
        facetSlug: string;
        openWithCreate?: string;
    } | null>(null);

    const getLabel = (translations: { languageCode: string; label: string }[]) =>
        translations.find((tr) => tr.languageCode === locale)?.label ??
        translations[0]?.label ??
        "";

    const handleFacetChange = (facet: Facet, newSlugsForFacet: string[]) => {
        const otherFacetSlugs = selectedSlugs.filter(
            (s) => !facet.tags.some((tag) => tag.slug === s)
        );
        onChange([...otherFacetSlugs, ...newSlugsForFacet]);
    };

    const renderFacetRow = (facet: Facet) => (
        <div key={facet.slug} className={compact ? "space-y-1.5" : "space-y-2"}>
            <div className="flex items-center justify-between">
                {compact ? (
                    <span className="text-muted-foreground block text-[10px] font-medium tracking-wider uppercase">
                        {getLabel(facet.translations)}
                    </span>
                ) : (
                    <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        {getLabel(facet.translations)}
                    </h3>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className={compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs"}
                    onClick={() => setManageState({ facetSlug: facet.slug })}
                >
                    {t("manage")}
                </Button>
            </div>
            <FacetCombobox
                facet={facet}
                selectedSlugs={selectedSlugs.filter((s) =>
                    facet.tags.some((tag) => tag.slug === s)
                )}
                inheritedSlugs={inheritedSlugs.filter((s) =>
                    facet.tags.some((tag) => tag.slug === s)
                )}
                onChange={(newSlugsForFacet) => handleFacetChange(facet, newSlugsForFacet)}
                onCreateTag={(query) =>
                    setManageState({ facetSlug: facet.slug, openWithCreate: query })
                }
                compact={compact}
            />
        </div>
    );

    if (isLoading) {
        return compact ? (
            <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
            </div>
        ) : (
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
            </div>
        );
    }

    if (!facets?.length) return null;

    const managedFacet = manageState
        ? (facets.find((f) => f.slug === manageState.facetSlug) ?? null)
        : null;

    const sheet =
        manageState && managedFacet ? (
            <TagManagementSheet
                key={`${manageState.facetSlug}-${manageState.openWithCreate ?? ""}`}
                open={true}
                facet={managedFacet}
                onOpenChange={(o) => !o && setManageState(null)}
                openWithCreate={manageState.openWithCreate}
            />
        ) : null;

    if (compact) {
        return (
            <div className="space-y-4">
                <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("sectionLabel")}
                </Label>
                <div className="space-y-3">{facets.map(renderFacetRow)}</div>
                {sheet}
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <h2 className="border-border/80 border-b pb-2 text-sm font-semibold">
                {t("sectionLabel")}
            </h2>
            <div className="space-y-5">{facets.map(renderFacetRow)}</div>
            {sheet}
        </section>
    );
}
