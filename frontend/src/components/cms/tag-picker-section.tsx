"use client";

import { useLocale, useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

    const toggle = (slug: string) => {
        if (inheritedSlugs.includes(slug)) return;
        if (selectedSlugs.includes(slug)) {
            onChange(selectedSlugs.filter((s) => s !== slug));
        } else {
            onChange([...selectedSlugs, slug]);
        }
    };

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
                            <span className="text-muted-foreground block text-[10px] font-medium tracking-wider uppercase">
                                {getLabel(facet.translations)}
                            </span>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                                {facet.tags.map((tag) => {
                                    const isInherited = inheritedSlugs.includes(tag.slug);
                                    const isChecked =
                                        isInherited || selectedSlugs.includes(tag.slug);
                                    const checkboxId = `tag-${tag.slug}`;
                                    return (
                                        <div key={tag.slug} className="flex items-center gap-1.5">
                                            <Checkbox
                                                id={checkboxId}
                                                checked={isChecked}
                                                disabled={isInherited}
                                                onCheckedChange={() => toggle(tag.slug)}
                                                className="h-3.5 w-3.5"
                                            />
                                            <label
                                                htmlFor={checkboxId}
                                                className={`cursor-pointer text-xs ${isInherited ? "text-muted-foreground" : ""}`}
                                            >
                                                {getLabel(tag.translations)}
                                                {isInherited && (
                                                    <span className="text-muted-foreground ml-1 text-[9px]">
                                                        ({t("inherited")})
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
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
                        <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                            {getLabel(facet.translations)}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                            {facet.tags.map((tag) => {
                                const isInherited = inheritedSlugs.includes(tag.slug);
                                const isChecked = isInherited || selectedSlugs.includes(tag.slug);
                                const checkboxId = `tag-${tag.slug}`;
                                return (
                                    <div key={tag.slug} className="flex items-center gap-2">
                                        <Checkbox
                                            id={checkboxId}
                                            checked={isChecked}
                                            disabled={isInherited}
                                            onCheckedChange={() => toggle(tag.slug)}
                                        />
                                        <label
                                            htmlFor={checkboxId}
                                            className={`cursor-pointer text-sm ${isInherited ? "text-muted-foreground" : ""}`}
                                        >
                                            {getLabel(tag.translations)}
                                            {isInherited && (
                                                <span className="text-muted-foreground ml-1 text-xs">
                                                    ({t("inherited")})
                                                </span>
                                            )}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
