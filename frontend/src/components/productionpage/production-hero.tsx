"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { getLocalizedField } from "@/lib/locale";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import type { Production } from "@/types/models/production.types";
import type { Media } from "@/types/models/media.types";

export function ProductionHero({
    production,
    locale,
    media = [],
}: {
    production: Production;
    locale: string;
    media?: Media[];
}) {
    const t = useTranslations("ProductionPage");

    const title = getLocalizedField(production, "title", locale) ?? production.slug;
    const artist = getLocalizedField(production, "artist", locale);
    const hasEnglishTitle = production.translations.some((t) => t.languageCode === "en" && t.title);

    const coverImage = media.find((m) => m.url) ?? null;
    const coverAlt =
        (locale === "nl"
            ? coverImage?.altTextNl
            : locale === "fr"
              ? coverImage?.altTextFr
              : coverImage?.altTextEn) ??
        title ??
        "";
    const credit =
        (locale === "nl"
            ? coverImage?.creditNl
            : locale === "fr"
              ? coverImage?.creditFr
              : coverImage?.creditEn) ??
        coverImage?.creditNl ??
        coverImage?.creditEn ??
        null;

    // tags
    const tags = [production.uitdatabankTheme, production.uitdatabankType].filter(
        (tag): tag is string => Boolean(tag)
    );

    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const spotlightItems: SpotlightItem[] = coverImage
        ? [{ kind: "media", media: coverImage }]
        : [];

    return (
        <div className="border-foreground animate-in fade-in slide-in-from-bottom-2 fill-mode-both grid grid-cols-1 gap-0 border-b-2 duration-500 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_480px]">
            <div className="border-border order-2 flex min-h-[300px] flex-col justify-between border-b p-6 sm:p-10 lg:order-1 lg:min-h-[460px] lg:border-r lg:border-b-0">
                {/* Eyebrow */}
                <div className="mb-5 flex items-center gap-2.5">
                    <span className="border-foreground bg-foreground text-background border-[1.2px] px-2.5 py-1 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                        {t("eyebrow")}
                    </span>
                    {production.uitdatabankType && (
                        <span className="border-foreground text-foreground border-[1.2px] px-2.5 py-1 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                            {production.uitdatabankType}
                        </span>
                    )}
                    <span className="text-muted-foreground ml-auto font-mono text-[10px] tracking-[1.2px] sm:ml-0">
                        {t("archiveNumber")} {production.sourceId ?? production.id.substring(0, 5)}
                    </span>
                </div>

                {/* Titles */}
                <div className="flex flex-1 flex-col justify-center py-4">
                    {artist && (
                        <h1 className="font-display text-foreground mb-1 text-[clamp(32px,4.5vw,58px)] leading-[1.05] font-bold tracking-[-0.03em]">
                            {artist}
                        </h1>
                    )}
                    <p
                        className={`font-display text-[clamp(32px,4.5vw,58px)] leading-[1.05] font-bold tracking-[-0.03em] italic ${artist ? "text-foreground/40" : "text-foreground"} mb-6`}
                    >
                        {title}
                    </p>

                    <div className="mb-8 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="border-border text-muted-foreground border px-3 py-1.5 font-mono text-[9px] tracking-[1.3px] uppercase"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Meta strip */}
                <div className="border-muted/25 flex border-t pt-4">
                    <div className="border-muted/25 mr-5 min-w-0 flex-1 border-r pr-5">
                        <div className="text-muted-foreground mb-1 font-mono text-[8px] tracking-[1.6px] uppercase">
                            {t("metaType")}
                        </div>
                        <div className="font-body text-foreground truncate text-[13px] leading-[1.4] font-medium">
                            {production.uitdatabankType ?? "-"}
                        </div>
                    </div>
                    <div className="border-muted/25 mr-5 min-w-0 flex-1 border-r pr-5">
                        <div className="text-muted-foreground mb-1 font-mono text-[8px] tracking-[1.6px] uppercase">
                            {t("metaTheme")}
                        </div>
                        <div className="font-body text-foreground truncate text-[13px] leading-[1.4] font-medium">
                            {production.uitdatabankTheme ?? "-"}
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground mb-1 font-mono text-[8px] tracking-[1.6px] uppercase">
                            {t("metaLanguage")}
                        </div>
                        <div className="font-body text-foreground text-[13px] leading-[1.4] font-medium">
                            {hasEnglishTitle ? t("languageNlEn") : t("languageNl")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side (Image) */}
            <div className="relative order-1 min-h-[300px] overflow-hidden bg-[#ccc6bc] lg:order-2 lg:min-h-auto">
                {coverImage?.url ? (
                    <button
                        type="button"
                        onClick={() => setSpotlightOpen(true)}
                        className="absolute inset-0 cursor-zoom-in"
                        aria-label={coverAlt || t("openCoverImage")}
                    >
                        <Image
                            src={coverImage.url}
                            alt={coverAlt}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 480px"
                            priority
                        />
                    </button>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
                <div className="bg-foreground/70 text-background/80 pointer-events-none absolute right-0 bottom-0 left-0 p-3 font-mono text-[8px] tracking-[1.2px] uppercase">
                    © {credit ?? t("imageCaptionFallback")}
                </div>
            </div>
            {spotlightItems.length > 0 && (
                <ImageSpotlight
                    items={spotlightItems}
                    index={0}
                    open={spotlightOpen}
                    onOpenChange={setSpotlightOpen}
                    eyebrow={t("eyebrow")}
                />
            )}
        </div>
    );
}
