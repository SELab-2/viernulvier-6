"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Production } from "@/types/models/production.types";
import { getLocalizedField } from "@/lib/locale";
import { Link } from "@/i18n/routing";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";

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
                <span className="bg-border/80 h-px flex-1" />
            </div>

            <div className="bg-border/80 border-border/80 -mx-4 grid grid-cols-1 gap-px border-y sm:-mx-[30px] sm:grid-cols-[1.6fr_1fr_1fr]">
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

    return (
        <Link
            href={`/productions/${production.id}`}
            className="group bg-background hover:bg-muted/40 relative block cursor-pointer p-4 pb-5 transition-all sm:p-5"
        >
            <div
                className={`bg-muted border-border/70 relative mb-3 w-full overflow-hidden border ${isFirst ? "h-[180px] sm:h-[260px]" : "h-[140px] sm:h-[170px]"}`}
            >
                {production.coverImageUrl ? (
                    <Image
                        src={production.coverImageUrl}
                        alt={title}
                        fill
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

            {production.tags.length > 0 && (
                <EntityTagStrip
                    tags={production.tags}
                    locale={locale}
                    cap={isFirst ? 3 : 2}
                    variant="compact"
                    className="mb-2"
                    interactive={false}
                />
            )}

            <div
                className={`font-display text-foreground leading-[1.1] font-bold tracking-[-0.02em] ${
                    isFirst ? "text-[26px] sm:text-[34px]" : "text-[19px] sm:text-[21px]"
                }`}
            >
                {title}
            </div>

            {artist && (
                <div className="font-body text-muted-foreground mt-1.5 mb-2 text-xs italic">
                    {artist}
                </div>
            )}

            {tagline && (
                <p
                    className={`font-body text-foreground/70 group-hover:text-foreground border-border/70 border-t pt-2.5 leading-snug transition-colors ${isFirst ? "text-sm" : "text-xs"}`}
                >
                    {tagline}
                </p>
            )}
        </Link>
    );
}
