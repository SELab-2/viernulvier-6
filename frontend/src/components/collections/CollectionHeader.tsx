"use client";

import { useLocale, useTranslations } from "next-intl";
import { Collection } from "@/types/models/collection.types";

function getLocalized(
    translations: { languageCode: string; title: string; description: string }[],
    locale: string,
    field: "title" | "description"
): string {
    return (
        translations.find((t) => t.languageCode === locale)?.[field] ??
        translations[0]?.[field] ??
        ""
    );
}

function formatDate(dateStr: string, locale: string): string {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

interface CollectionHeaderProps {
    collection: Collection;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
    const locale = useLocale();
    const t = useTranslations("Collections");

    const title = getLocalized(collection.translations, locale, "title");
    const description = getLocalized(collection.translations, locale, "description");

    return (
        <header className="mb-10">
            {/* Section kicker */}
            <p className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2.5px] uppercase">
                {t("sectionLabel")}
            </p>

            {/* Title */}
            <h1 className="font-display text-foreground text-[40px] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[56px]">
                {title}
            </h1>

            {/* Cover image placeholder — swap for <Image> once cover_image is added to the API */}
            <div className="mt-6 aspect-[16/7] w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />

            {/* Dateline bar */}
            <div className="border-foreground text-foreground mt-4 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase">
                <span>{t("items", { count: collection.items.length })}</span>
                <time dateTime={collection.updatedAt}>
                    {formatDate(collection.updatedAt, locale)}
                </time>
            </div>

            {/* Description */}
            {description && (
                <p className="text-muted-foreground mt-4 max-w-[750px] font-mono text-[13px] leading-relaxed italic">
                    {description}
                </p>
            )}
        </header>
    );
}
