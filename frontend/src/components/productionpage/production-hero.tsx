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

    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const spotlightItems: SpotlightItem[] = coverImage
        ? [{ kind: "media", media: coverImage }]
        : [];

    return (
        <div className="border-foreground animate-in fade-in slide-in-from-bottom-2 fill-mode-both grid grid-cols-1 gap-0 border-b-2 duration-500 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_480px]">
            <div className="border-border order-2 flex min-h-[300px] flex-col justify-between border-b p-6 sm:p-10 lg:order-1 lg:min-h-[460px] lg:border-r lg:border-b-0">
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
                />
            )}
        </div>
    );
}
