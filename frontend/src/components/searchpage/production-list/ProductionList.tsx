"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";
import { getLocalizedField } from "@/lib/locale";

interface ProductionItemProps {
    production: Production;
    locale: string;
    events?: Event[];
}

function formatDate(dateStr: string, locale: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-BE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function EventRow({ event, locale }: { event: Event; locale: string }) {
    const t = useTranslations("Events");
    const isPast = new Date(event.startsAt) < new Date();

    return (
        <div className="border-muted/25 flex items-center justify-between border-b px-4 py-2 last:border-b-0 sm:px-0">
            <div className="flex items-center gap-3">
                <span className="font-body text-foreground text-xs">
                    {formatDate(event.startsAt, locale)}
                </span>
                <span
                    className={`font-mono text-[8px] tracking-[1px] uppercase ${
                        isPast ? "text-muted-foreground" : "text-foreground"
                    }`}
                >
                    {isPast ? t("past") : t("upcoming")}
                </span>
            </div>
            <span className="border-border text-muted-foreground border px-1.5 py-px font-mono text-[8px] tracking-[1px] uppercase">
                {event.status}
            </span>
        </div>
    );
}

export function ProductionItem({ production, locale, events = [] }: ProductionItemProps) {
    const [expanded, setExpanded] = useState(false);
    const t = useTranslations("Productions");

    const toggle = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const title = getLocalizedField(production, "title", locale) ?? production.slug;
    const artist = getLocalizedField(production, "artist", locale);
    const tagline = getLocalizedField(production, "tagline", locale);

    const tags = [production.uitdatabankTheme, production.uitdatabankType].filter(
        (tag): tag is string => Boolean(tag)
    );

    const displayType = production.uitdatabankType ?? "Productie";

    return (
        <>
            <div
                onClick={toggle}
                className={`border-muted/35 hover:bg-muted/5 flex cursor-pointer items-start gap-3 border-b px-4 py-3.5 transition-colors sm:gap-[18px] sm:px-7 ${
                    expanded ? "bg-muted/5" : ""
                }`}
                style={{ animation: "fadein 0.3s ease both" }}
            >
                {/* TODO: replace with actual production image from API when available */}
                <div className="bg-muted relative h-[52px] w-[68px] shrink-0 overflow-hidden sm:h-[62px] sm:w-[86px]">
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="font-display text-foreground mb-0.5 text-[16px] leading-[1.1] font-bold tracking-[-0.02em] sm:text-[18px]">
                        {title}
                    </div>

                    {artist && (
                        <div className="font-display text-foreground/38 mb-1.5 text-[16px] font-bold tracking-[-0.02em] sm:text-[18px]">
                            {artist}
                        </div>
                    )}

                    {tagline && (
                        <p className="font-body text-muted-foreground mb-1 text-xs leading-relaxed">
                            {tagline}
                        </p>
                    )}

                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="border-border text-muted-foreground border px-1.5 py-px font-mono text-[8px] tracking-[1.1px] uppercase sm:px-2 sm:py-0.5"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <span className="border-foreground text-foreground border px-2 py-1 font-mono text-[8px] font-medium tracking-[1.3px] uppercase sm:px-2 sm:py-1">
                        {displayType}
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="border-muted/35 bg-muted/4 flex flex-col border-b pl-4 sm:pl-[calc(28px+86px+18px)]">
                    {events.length > 0 ? (
                        events.map((event) => (
                            <EventRow key={event.id} event={event} locale={locale} />
                        ))
                    ) : (
                        <div className="border-muted/35 font-body text-muted-foreground border-t px-4 py-2.5 text-xs tracking-[0.06em] sm:px-0">
                            {t("eventsAvailableSoon")}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

interface ProductionListProps {
    productions: Production[];
    locale: string;
    eventsByProduction?: Map<string, Event[]>;
}

export function ProductionList({ productions, locale, eventsByProduction }: ProductionListProps) {
    return (
        <div className="overflow-hidden">
            {productions.map((production) => (
                <ProductionItem
                    key={production.id}
                    production={production}
                    locale={locale}
                    events={eventsByProduction?.get(production.id)}
                />
            ))}
        </div>
    );
}
