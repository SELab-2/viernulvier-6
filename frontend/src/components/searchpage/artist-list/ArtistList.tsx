"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import type { Artist } from "@/types/models/artist.types";
import { LoadingState } from "@/components/shared/loading-state";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

interface ArtistItemProps {
    artist: Artist;
}

function ArtistItem({ artist }: ArtistItemProps) {
    const t = useTranslations("Sidebar");
    return (
        <Link
            href={`/artists/${artist.id}`}
            className="border-border/70 hover:bg-muted/40 flex cursor-pointer items-center gap-3 border-b px-4 py-3.5 transition-all sm:gap-[18px] sm:px-7"
            style={{ animation: "fadein 0.3s ease both" }}
        >
            <div className="bg-muted relative h-[108px] w-[144px] shrink-0 overflow-hidden sm:h-[136px] sm:w-[180px]">
                {artist.coverImageUrl ? (
                    <Image
                        src={artist.coverImageUrl}
                        alt={artist.name}
                        fill
                        className="object-cover"
                        sizes="180px"
                    />
                ) : (
                    <ImagePlaceholder id={artist.id} className="absolute inset-0" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <span className="font-display text-foreground block text-[19px] leading-[1.1] font-bold tracking-[-0.02em] hover:underline sm:text-[22px]">
                    {artist.name}
                </span>
                <span className="text-muted-foreground mt-1 block font-mono text-[11px] tracking-[0.08em]">
                    {artist.slug}
                </span>
            </div>

            <span className="border-foreground text-foreground shrink-0 border px-2 py-1 font-mono text-[8px] font-medium tracking-[1.3px] uppercase">
                {t("categories.artists")}
            </span>
        </Link>
    );
}

interface ArtistListProps {
    artists: Artist[];
    isLoading?: boolean;
}

export function ArtistList({ artists, isLoading }: ArtistListProps) {
    const t = useTranslations("Home");

    return (
        <div
            className={`relative overflow-hidden ${
                isLoading && artists.length === 0 ? "flex-1" : ""
            }`}
        >
            {isLoading && artists.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <LoadingState message={t("loading")} className="min-h-0" />
                </div>
            )}
            {artists.map((artist) => (
                <ArtistItem key={artist.id} artist={artist} />
            ))}
        </div>
    );
}
