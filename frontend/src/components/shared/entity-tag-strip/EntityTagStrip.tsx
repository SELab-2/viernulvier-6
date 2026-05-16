"use client";

import { useMemo } from "react";

import { Link } from "@/i18n/routing";
import { useTaxonomyLookup } from "@/hooks/api/useTaxonomyLookup";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type EntityTagStripProps = {
    tags: { slug: string; facet: string }[];
    locale: string;
    cap?: number;
    variant?: "default" | "compact";
    className?: string;
};

const CHIP_BASE =
    "border-border/80 text-foreground/80 inline-flex items-center border font-mono text-[9px] tracking-[1.2px] uppercase transition-colors";
const CHIP_DEFAULT_PAD = "px-2 py-1";
const CHIP_COMPACT_PAD = "px-1.5 py-0.5";

export function EntityTagStrip({
    tags,
    locale,
    cap = 4,
    variant = "default",
    className,
}: EntityTagStripProps) {
    const lookup = useTaxonomyLookup(locale);

    const resolved = useMemo(() => {
        return tags
            .map((t) => {
                const entry = lookup.get(t.slug);
                if (!entry) return null;
                return { slug: t.slug, ...entry };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => {
                if (a.facetSortIndex !== b.facetSortIndex) {
                    return a.facetSortIndex - b.facetSortIndex;
                }
                return a.sortOrder - b.sortOrder;
            });
    }, [tags, lookup]);

    if (resolved.length === 0) {
        return null;
    }

    const visible = resolved.slice(0, cap);
    const hidden = resolved.slice(cap);
    const padding = variant === "compact" ? CHIP_COMPACT_PAD : CHIP_DEFAULT_PAD;

    return (
        <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
            {visible.map((tag) => (
                <Link
                    key={tag.slug}
                    href={`/search?facet=${tag.facet}&tag=${tag.slug}`}
                    data-testid="entity-tag-chip"
                    className={`${CHIP_BASE} ${padding} hover:border-foreground hover:text-foreground`}
                >
                    {tag.label}
                </Link>
            ))}
            {hidden.length > 0 && (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                data-testid="entity-tag-overflow"
                                title={hidden.map((t) => t.label).join(", ")}
                                className={`${CHIP_BASE} ${padding} cursor-default`}
                            >
                                +{hidden.length}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={4}>
                            <div className="flex max-w-[260px] flex-col gap-0.5">
                                {hidden.map((tag) => (
                                    <span
                                        key={tag.slug}
                                        data-testid="entity-tag-overflow-chip"
                                        className="font-mono text-[10px] tracking-[1.1px] uppercase"
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
