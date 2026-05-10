"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import type { Location } from "@/types/models/location.types";
import { LoadingState } from "@/components/shared/loading-state";

interface LocationItemProps {
    location: Location;
}

function LocationItem({ location }: LocationItemProps) {
    const href = location.slug ? `/locations/${location.slug}` : `/locations/${location.id}`;
    const displayName = location.name ?? location.address;

    return (
        <Link
            href={href}
            className="border-muted/35 hover:bg-muted/5 flex cursor-pointer items-center gap-3 border-b px-4 py-3.5 transition-all sm:gap-[18px] sm:px-7"
            style={{ animation: "fadein 0.3s ease both" }}
        >
            <div className="bg-muted relative h-[108px] w-[144px] shrink-0 overflow-hidden sm:h-[136px] sm:w-[180px]">
                {location.coverImageUrl ? (
                    <Image
                        src={location.coverImageUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="180px"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <span className="font-display text-foreground block text-[19px] leading-[1.1] font-bold tracking-[-0.02em] hover:underline sm:text-[22px]">
                    {displayName}
                </span>
                {location.city && (
                    <span className="text-muted-foreground mt-0.5 block font-mono text-[11px] tracking-[0.08em]">
                        {location.city}
                    </span>
                )}
            </div>

            <span className="border-foreground text-foreground shrink-0 border px-2 py-1 font-mono text-[8px] font-medium tracking-[1.3px] uppercase">
                Locatie
            </span>
        </Link>
    );
}

interface LocationListProps {
    locations: Location[];
    isLoading?: boolean;
}

export function LocationList({ locations, isLoading }: LocationListProps) {
    const t = useTranslations("Home");

    return (
        <div
            className={`relative overflow-hidden ${
                isLoading && locations.length === 0 ? "flex-1" : ""
            }`}
        >
            {isLoading && locations.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <LoadingState message={t("loading")} className="min-h-0" />
                </div>
            )}
            {locations.map((location) => (
                <LocationItem key={location.id} location={location} />
            ))}
        </div>
    );
}
