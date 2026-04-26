"use client";

import { Link2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getLocalizedField } from "@/lib/locale";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

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
    const tProd = useTranslations("ProductionPage");

    const hasEnglishTitle = production.translations.some(
        (tr) => tr.languageCode === "en" && tr.title
    );
    const productionTitle = getLocalizedField(production, "title", locale) ?? production.slug;

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
                <span className="text-muted-foreground mb-4 block font-mono text-[11px] font-medium tracking-[2px] uppercase">
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
                                <div className="font-body text-foreground mb-0.5 text-[15px] font-medium capitalize">
                                    {formatDateFull(event.startsAt, locale)}
                                </div>
                                <div className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[1.1px] uppercase">
                                    {formatTime(event.startsAt, locale)}
                                    {event.endsAt && ` – ${formatTime(event.endsAt, locale)}`}
                                    {" · De Vooruit"}
                                </div>
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
                <span className="text-muted-foreground mb-4 block font-mono text-[11px] font-medium tracking-[2px] uppercase">
                    Praktisch
                </span>

                <div className="border-muted/25 font-body flex items-baseline justify-between border-b py-1.5 text-[15px]">
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[1.2px] uppercase">
                        {tProd("metaLanguage")}
                    </span>
                    <span className="text-foreground font-medium">
                        {hasEnglishTitle ? tProd("languageNlEn") : tProd("languageNl")}
                    </span>
                </div>
                <div className="border-muted/25 font-body flex items-baseline justify-between border-b py-1.5 text-[15px]">
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[1.2px] uppercase">
                        Locatie
                    </span>
                    <span className="text-foreground font-medium">De Vooruit</span>
                </div>
                <div className="font-body flex items-baseline justify-between py-1.5 text-[15px]">
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[1.2px] uppercase">
                        Adres
                    </span>
                    <span className="text-foreground font-medium">Sint-Pietersnieuwstraat 23</span>
                </div>
            </div>

            {/* Share */}
            <div className="pb-6">
                <span className="text-muted-foreground mb-4 block font-mono text-[11px] font-medium tracking-[2px] uppercase">
                    Delen
                </span>
                <button
                    onClick={copyLink}
                    className="border-border text-muted-foreground hover:border-foreground hover:text-foreground mb-2 flex w-full cursor-pointer items-center justify-center gap-2 border bg-transparent px-2 py-2 font-mono text-[11px] tracking-[1.2px] uppercase transition-all"
                >
                    <Link2 size={10} strokeWidth={2} />
                    Kopieer link
                </button>
                <div className="flex gap-2">
                    <a
                        href={
                            typeof window !== "undefined"
                                ? `https://wa.me/?text=${encodeURIComponent(productionTitle + "\n" + window.location.href)}`
                                : "https://wa.me/"
                        }
                        target="_blank"
                        rel="noreferrer"
                        title={tProd("shareWhatsApp")}
                        className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex flex-1 cursor-pointer items-center justify-center border bg-transparent py-2 transition-all"
                    >
                        <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </a>
                    <a
                        href={
                            typeof window !== "undefined"
                                ? `mailto:?subject=${encodeURIComponent(productionTitle)}&body=${encodeURIComponent(window.location.href)}`
                                : "mailto:"
                        }
                        title={tProd("shareEmail")}
                        className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex flex-1 cursor-pointer items-center justify-center border bg-transparent py-2 transition-all"
                    >
                        <Mail size={11} strokeWidth={2} />
                    </a>
                </div>
            </div>
        </aside>
    );
}
