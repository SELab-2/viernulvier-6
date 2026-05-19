"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { getLocalizedField } from "@/lib/locale";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import type { Production } from "@/types/models/production.types";
import type { Media } from "@/types/models/media.types";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

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
        <>
            <div className="relative min-h-[300px] overflow-hidden bg-[#ccc6bc] lg:min-h-[460px]">
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
                    <ImagePlaceholder className="absolute inset-0" />
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
        </>
    );
}
