"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";
import { useFallbackLocation } from "@/hooks/api/useFallbackLocation";
import { Link } from "@/i18n/routing";

function formatDateFull(dateStr: string, locale: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "en" ? "en-US" : "nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatTime(dateStr: string, locale: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale === "en" ? "en-US" : "nl-BE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function ProductionSidebar({
    production,
    events,
    locale,
}: {
    production: Production;
    events: Event[];
    locale: string;
}) {
    const t = useTranslations("Events");

    const primaryLocation = production.locations.find((loc) => loc.slug) ?? null;
    const needsFallback = !primaryLocation;
    const fallbackLocation = useFallbackLocation(events, needsFallback);

    const copyLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link gekopieerd!");
        }
    };

    return (
        <aside className="flex flex-col">
            {/* Events Section */}
            <div className="border-muted/25 mb-6 border-b pb-6">
                <span className="text-muted-foreground mb-4 block font-mono text-[9px] font-medium tracking-[2px] uppercase">
                    {t("title") || "Voorstellingen"}
                </span>

                {events.length > 0 ? (
                    events.map((event) => {
                        const isPast = new Date(event.startsAt) < new Date();
                        return (
                            <div
                                key={event.id}
                                className="border-muted/25 border-b py-2.5 last:border-0"
                            >
                                <div className="font-body text-foreground mb-0.5 text-[13px] font-medium capitalize">
                                    {formatDateFull(event.startsAt, locale)}
                                </div>
                                <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[1.1px] uppercase">
                                    {formatTime(event.startsAt, locale)}
                                    {event.endsAt && ` – ${formatTime(event.endsAt, locale)}`}
                                    {" · De Vooruit"}
                                </div>
                                <button
                                    disabled={isPast}
                                    className={`inline-block border px-3 py-1.5 font-mono text-[9px] font-medium tracking-[1.4px] uppercase transition-all ${
                                        isPast
                                            ? "border-muted text-muted cursor-default"
                                            : "border-foreground text-foreground hover:bg-foreground hover:text-background cursor-pointer"
                                    }`}
                                >
                                    {isPast ? t("past") : event.status || "Tickets"}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground text-sm italic">
                        {t("noEvents") || "Geen evenementen beschikbaar"}
                    </div>
                )}
            </div>

            {/* Practical Info */}
            <div className="border-muted/25 mb-6 border-b pb-6">
                <span className="text-muted-foreground mb-4 block font-mono text-[9px] font-medium tracking-[2px] uppercase">
                    Praktisch
                </span>

                <div className="border-muted/25 font-body flex items-baseline justify-between border-b py-1.5 text-[12px]">
                    <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                        Type
                    </span>
                    <span className="text-foreground font-medium">
                        {production.uitdatabankType ?? "-"}
                    </span>
                </div>
                <div className="border-muted/25 font-body flex items-baseline justify-between border-b py-1.5 text-[12px]">
                    <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                        Thema
                    </span>
                    <span className="text-foreground font-medium">
                        {production.uitdatabankTheme ?? "-"}
                    </span>
                </div>
                <div className="font-body flex items-baseline justify-between py-1.5 text-[12px]">
                    <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                        Locatie
                    </span>
                    {primaryLocation?.slug ? (
                        <Link
                            href={`/locations/${primaryLocation.slug}`}
                            className="text-foreground group inline-flex items-center gap-0.5 font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        >
                            {primaryLocation.name ?? "-"}
                            <ArrowUpRight className="size-3 opacity-40 transition-opacity group-hover:opacity-100" />
                        </Link>
                    ) : fallbackLocation?.slug ? (
                        <Link
                            href={`/locations/${fallbackLocation.slug}`}
                            className="text-foreground group inline-flex items-center gap-0.5 font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        >
                            {fallbackLocation.name ?? "-"}
                            <ArrowUpRight className="size-3 opacity-40 transition-opacity group-hover:opacity-100" />
                        </Link>
                    ) : (
                        <span className="text-foreground font-medium">-</span>
                    )}
                </div>
            </div>

            {/* Share */}
            <div className="pb-6">
                <span className="text-muted-foreground mb-4 block font-mono text-[9px] font-medium tracking-[2px] uppercase">
                    Delen
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={copyLink}
                        className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex-1 cursor-pointer border bg-transparent px-2 py-2 text-center font-mono text-[9px] tracking-[1.2px] uppercase transition-all"
                    >
                        Kopieer link
                    </button>
                    <button className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex-1 cursor-pointer border bg-transparent px-2 py-2 text-center font-mono text-[9px] tracking-[1.2px] uppercase transition-all">
                        E-mail
                    </button>
                </div>
            </div>
        </aside>
    );
}
