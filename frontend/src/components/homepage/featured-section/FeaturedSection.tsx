"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Production } from "@/types/models/production.types";
import { getLocalizedField } from "@/lib/locale";

interface FeaturedSectionProps {
    productions: Production[];
    locale: string;
}

export function FeaturedSection({ productions, locale }: FeaturedSectionProps) {
    const t = useTranslations("Featured");
    const featured = productions.slice(0, 3);

    if (featured.length === 0) {
        return null;
    }

    return (
        <div>
            <div className="text-muted-foreground mb-3 flex items-center gap-2.5 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                {t("label")}
                <span className="bg-muted/40 h-px flex-1" />
            </div>

            <div className="bg-muted border-foreground -mx-4 grid grid-cols-1 gap-px border-x border-b-2 sm:-mx-[30px] sm:grid-cols-[1.6fr_1fr_1fr]">
                {featured.map((production, index) => (
                    <FeaturedCard
                        key={production.id}
                        production={production}
                        locale={locale}
                        isFirst={index === 0}
                    />
                ))}
            </div>
        </div>
    );
}

function FeaturedCard({
    production,
    locale,
    isFirst,
}: {
    production: Production;
    locale: string;
    isFirst: boolean;
}) {
    const title = getLocalizedField(production, "title", locale) ?? production.slug;
    const artist = getLocalizedField(production, "artist", locale);
    const tagline = getLocalizedField(production, "tagline", locale);
    const displayType = production.uitdatabankType ?? production.uitdatabankTheme;

    return (
        <div className="group bg-background hover:bg-muted/5 relative cursor-pointer p-4 pb-5 transition-colors sm:p-5">
            <div
                className={`relative mb-3 h-[160px] w-full overflow-hidden bg-[#CCC6BC] ${isFirst ? "sm:h-[200px]" : "sm:h-[140px]"}`}
            >
                {production.coverImageUrl ? (
                    <Image
                        src={production.coverImageUrl}
                        alt={title}
                        fill
                        unoptimized // TODO: Does not work without it (400) but need to fix in prod
                        className="object-cover"
                        sizes={
                            isFirst
                                ? "(min-width: 640px) 60vw, 100vw"
                                : "(min-width: 640px) 30vw, 100vw"
                        }
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>

            {displayType && (
                <div className="text-muted-foreground group-hover:text-foreground mb-1.5 font-mono text-[9px] tracking-[1.4px] uppercase transition-colors">
                    {displayType}
                </div>
            )}

            <div
                className={`font-display text-foreground mb-0.5 leading-[1.15] font-bold tracking-[-0.02em] ${
                    isFirst ? "text-[24px] sm:text-[30px]" : "text-[20px] sm:text-[22px]"
                }`}
            >
                {title}
            </div>

            {artist && (
                <div
                    className={`font-display text-foreground/40 mb-2.5 font-bold ${
                        isFirst ? "text-[24px] sm:text-[30px]" : "text-[20px] sm:text-[22px]"
                    }`}
                >
                    {artist}
                </div>
            )}

            {tagline && (
                <p className="font-body text-muted-foreground group-hover:text-foreground text-xs leading-relaxed transition-colors">
                    {tagline}
                </p>
            )}
        </div>
    );
}
