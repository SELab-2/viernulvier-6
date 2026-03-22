"use client";

import { useState, useCallback } from "react";

import type { Production } from "@/types/models/production.types";
import { getLocalizedField } from "@/lib/locale";

interface ProductionItemProps {
    production: Production;
    locale: string;
}

export function ProductionItem({ production, locale }: ProductionItemProps) {
    const [expanded, setExpanded] = useState(false);

    const toggle = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const title = getLocalizedField(production, "title", locale) ?? production.slug;
    const artist = getLocalizedField(production, "artist", locale);
    const tagline = getLocalizedField(production, "tagline", locale);

    const tags = [production.uitdatabankTheme, production.uitdatabankType].filter(
        (t): t is string => Boolean(t)
    );

    // TODO: derive display type from production data (uitdatabankType or similar field)
    const displayType = production.uitdatabankType ?? "Productie";

    return (
        <>
            <div
                onClick={toggle}
                className={`border-muted/35 hover:bg-muted/5 -mx-2.5 flex cursor-pointer items-start gap-5 border-b px-2.5 py-3.5 transition-colors ${
                    expanded ? "bg-muted/5" : ""
                }`}
                style={{ animation: "fadein 0.3s ease both" }}
            >
                {/* TODO: replace with actual production image from API when available */}
                <div className="bg-muted relative h-[66px] w-[90px] shrink-0 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="font-display text-foreground mb-0.5 text-xl leading-[1.15] font-bold tracking-[-0.02em]">
                        {title}
                    </div>

                    {artist && (
                        <div className="font-display text-foreground/40 mb-1.5 text-xl font-bold tracking-[-0.02em]">
                            {artist}
                        </div>
                    )}

                    {tagline && (
                        <p className="font-body text-muted-foreground mb-1.5 text-xs leading-relaxed">
                            {tagline}
                        </p>
                    )}

                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="border-border text-muted-foreground border px-2 py-0.5 font-mono text-[9px] tracking-[1.2px] uppercase"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <span className="border-foreground text-foreground border-[1.2px] px-2.5 py-[5px] font-mono text-[9px] font-medium tracking-[1.4px] uppercase">
                        {displayType}
                    </span>
                    {/* TODO: show "zie events" link when events API is available */}
                </div>
            </div>

            {/* TODO: render actual event rows when events API is available */}
            {expanded && (
                <div className="flex flex-col pb-3.5 pl-[110px]">
                    <div className="border-muted/35 font-body text-muted-foreground border-t py-2.5 text-xs tracking-[0.08em]">
                        {/* TODO: map production events from API */}
                        Evenementen binnenkort beschikbaar
                    </div>
                </div>
            )}
        </>
    );
}

interface ProductionListProps {
    productions: Production[];
    locale: string;
    searchQuery?: string;
}

export function ProductionList({ productions, locale, searchQuery }: ProductionListProps) {
    const filtered = searchQuery
        ? productions.filter((p) => {
              const title = getLocalizedField(p, "title", locale) ?? p.slug;
              const artist = getLocalizedField(p, "artist", locale) ?? "";
              const text = `${title} ${artist} ${p.slug}`.toLowerCase();
              return text.includes(searchQuery.toLowerCase());
          })
        : productions;

    return (
        <div>
            <div className="border-muted/35 mb-0 flex items-baseline gap-4 border-b py-[18px] pb-2.5">
                <h2 className="font-display text-[13px] font-medium tracking-[0.08em] uppercase">
                    Producties
                </h2>
                <span className="text-muted-foreground font-mono text-[10px] tracking-wider">
                    Toont {filtered.length} van {productions.length} resultaten
                </span>
            </div>

            {filtered.map((production) => (
                <ProductionItem key={production.id} production={production} locale={locale} />
            ))}
        </div>
    );
}
