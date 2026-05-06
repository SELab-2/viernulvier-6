"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { useGetSeriesForProduction } from "@/hooks/api/useSeries";
import { Series } from "@/types/models/series.types";

function SeriesCard({ series, locale }: { series: Series; locale: string }) {
    const translation =
        series.translations.find((t) => t.languageCode === locale) ?? series.translations[0];

    return (
        <Link
            href={`/series/${series.slug}`}
            className="group bg-background border-muted/30 hover:bg-muted/5 flex items-center gap-4 border p-4 transition-colors"
        >
            <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden">
                {series.coverImageUrl ? (
                    <Image
                        src={series.coverImageUrl}
                        alt={translation.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="64px"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>
            <div className="min-w-0">
                <div className="text-muted-foreground mb-1 font-mono text-[8px] tracking-[1.4px] uppercase">
                    {series.productionIds.length} ITEMS
                </div>
                <h3 className="font-display text-[16px] leading-tight font-bold group-hover:underline">
                    {translation.name}
                </h3>
                {translation.subtitle && (
                    <p className="font-display text-muted-foreground mt-0.5 line-clamp-1 text-[14px] italic">
                        {translation.subtitle}
                    </p>
                )}
            </div>
        </Link>
    );
}

export function ProductionSeriesBlock({ productionId }: { productionId: string }) {
    const locale = useLocale();
    const t = useTranslations("Series");
    const { data: series = [], isLoading } = useGetSeriesForProduction(productionId);

    if (isLoading || series.length === 0) return null;

    return (
        <div className="border-muted/30 bg-background border-t px-6 py-10 sm:px-10">
            <h2 className="text-muted-foreground mb-6 font-mono text-[9px] tracking-[2.5px] uppercase">
                {t("partOf")}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {series.map((s) => (
                    <SeriesCard key={s.id} series={s} locale={locale} />
                ))}
            </div>
        </div>
    );
}
