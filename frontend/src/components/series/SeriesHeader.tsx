"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Series } from "@/types/models/series.types";

function getLocalized(
    translations: { languageCode: string; name: string; subtitle: string; description: string }[],
    locale: string,
    field: "name" | "subtitle" | "description"
): string {
    return (
        translations.find((t) => t.languageCode === locale)?.[field] ??
        translations[0]?.[field] ??
        ""
    );
}

function formatDateRange(startStr: string | null, endStr: string | null, locale: string): string {
    if (!startStr) return "—";

    const loc = locale === "en" ? "en-GB" : "nl-BE";
    const start = new Date(startStr);
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
    };

    if (!endStr) {
        return start.toLocaleDateString(loc, options);
    }

    const end = new Date(endStr);
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
        return start.toLocaleDateString(loc, options);
    }

    return `${start.toLocaleDateString(loc, options)} - ${end.toLocaleDateString(loc, options)}`;
}

interface SeriesHeaderProps {
    series: Series;
}

export function SeriesHeader({ series }: SeriesHeaderProps) {
    const locale = useLocale();
    const t = useTranslations("Series");

    const name = getLocalized(series.translations, locale, "name");
    const subtitle = getLocalized(series.translations, locale, "subtitle");
    const description = getLocalized(series.translations, locale, "description");

    return (
        <header className="mb-10">
            {/* Section kicker */}
            <p className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2.5px] uppercase">
                {t("sectionLabel")}
            </p>

            {/* Title */}
            <h1 className="font-display text-foreground text-[40px] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[56px]">
                {name}
            </h1>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-muted-foreground font-display mt-2 text-[20px] leading-tight italic sm:text-[24px]">
                    {subtitle}
                </p>
            )}

            {/* Cover image */}
            {series.coverImageUrl ? (
                <div className="relative mt-6 aspect-[16/7] w-full overflow-hidden">
                    <Image
                        src={series.coverImageUrl}
                        alt={name}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, 1100px"
                    />
                </div>
            ) : (
                <div className="mt-6 aspect-[16/7] w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
            )}

            {/* Dateline bar */}
            <div className="border-foreground text-foreground mt-4 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase">
                <div className="flex items-center gap-3">
                    <span>
                        {t("items", {
                            count: series.productionIds.length,
                        })}
                    </span>
                </div>
                <span>{formatDateRange(series.periodStart, series.periodEnd, locale)}</span>
            </div>

            {/* Description */}
            {description && (
                <p className="text-muted-foreground mt-4 max-w-[750px] font-mono text-[13px] leading-relaxed break-words italic">
                    {description}
                </p>
            )}
        </header>
    );
}
