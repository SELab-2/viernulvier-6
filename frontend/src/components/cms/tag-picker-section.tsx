"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FacetCombobox } from "@/components/cms/facet-combobox";
import { TagManagementSheet } from "@/components/cms/tag-management-sheet";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { EntityType } from "@/types/models/taxonomy.types";

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

    const getLabel = (translations: { languageCode: string; label: string }[]) => {
        return (
            translations.find((tr) => tr.languageCode === locale)?.label ??
            translations[0]?.label ??
            ""
        );
    };

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

    if (compact) {
        return (
            <div className="space-y-4">
                <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("sectionLabel")}
                </Label>
                <div className="space-y-3">
                    {facets.map((facet) => (
                        <div key={facet.slug} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground block text-[10px] font-medium tracking-wider uppercase">
                                    {getLabel(facet.translations)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px]"
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
                                onChange={(newSlugsForFacet) => {
                                    const otherFacetSlugs = selectedSlugs.filter(
                                        (s) => !facet.tags.some((tag) => tag.slug === s)
                                    );
                                    onChange([...otherFacetSlugs, ...newSlugsForFacet]);
                                }}
                                onCreateTag={(query) =>
                                    setManageState({
                                        facetSlug: facet.slug,
                                        openWithCreate: query,
                                    })
                                }
                                compact={compact}
                            />
                        </div>
                    ))}
                </div>
                {manageState && (
                    <TagManagementSheet
                        key={`${manageState.facetSlug}-${manageState.openWithCreate ?? ""}`}
                        open={true}
                        facet={facets.find((f) => f.slug === manageState.facetSlug)!}
                        onOpenChange={(o) => !o && setManageState(null)}
                        openWithCreate={manageState.openWithCreate}
                    />
                )}
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <h2 className="border-foreground/10 border-b pb-2 text-sm font-semibold">
                {t("sectionLabel")}
            </h2>
            <div className="space-y-5">
                {facets.map((facet) => (
                    <div key={facet.slug} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                                {getLabel(facet.translations)}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
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
                            onChange={(newSlugsForFacet) => {
                                const otherFacetSlugs = selectedSlugs.filter(
                                    (s) => !facet.tags.some((tag) => tag.slug === s)
                                );
                                onChange([...otherFacetSlugs, ...newSlugsForFacet]);
                            }}
                            onCreateTag={(query) =>
                                setManageState({
                                    facetSlug: facet.slug,
                                    openWithCreate: query,
                                })
                            }
                            compact={compact}
                        />
                    </div>
                ))}
            </div>
            {manageState && (
                <TagManagementSheet
                    key={`${manageState.facetSlug}-${manageState.openWithCreate ?? ""}`}
                    open={true}
                    facet={facets.find((f) => f.slug === manageState.facetSlug)!}
                    onOpenChange={(o) => !o && setManageState(null)}
                    openWithCreate={manageState.openWithCreate}
                />
            )}
        </section>
    );
}
