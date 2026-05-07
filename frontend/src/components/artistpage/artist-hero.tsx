"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Artist } from "@/types/models/artist.types";

export function ArtistHero({ artist }: { artist: Artist }) {
    const t = useTranslations("ArtistPage");

    return (
        <div className="border-foreground animate-in fade-in slide-in-from-bottom-2 fill-mode-both grid grid-cols-1 border-b-2 duration-500 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_480px]">
            {/* Left: info */}
            <div className="border-border order-2 flex min-h-[300px] flex-col justify-between border-b p-6 sm:p-10 lg:order-1 lg:min-h-[380px] lg:border-r lg:border-b-0">
                <div>
                    <span className="border-foreground bg-foreground text-background border-[1.2px] px-2.5 py-1 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                        {t("eyebrow")}
                    </span>
                </div>

                <div className="flex flex-1 flex-col justify-center py-6">
                    <h1 className="font-display text-foreground mb-6 text-[clamp(36px,5vw,68px)] leading-[1.05] font-bold tracking-[-0.03em]">
                        {artist.name}
                    </h1>
                    <div className="border-muted/30 text-muted-foreground flex min-h-[60px] items-center border border-dashed px-4 py-3 font-mono text-[9px] tracking-[1.2px] uppercase">
                        {t("descriptionPlaceholder")}
                    </div>
                </div>
            </div>

            {/* Right: image */}
            <div className="relative order-1 min-h-[280px] overflow-hidden bg-[#ccc6bc] lg:order-2 lg:min-h-auto">
                <Image
                    src={artist.coverImageUrl ?? "/images/unknown_artist.png"}
                    alt={artist.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 480px"
                    priority
                />
            </div>
        </div>
    );
}
