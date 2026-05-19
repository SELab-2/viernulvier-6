"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Phone } from "lucide-react";
import Image from "next/image";

import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { MasonryGrid } from "@/components/masonry";
import { useGetLocationBySlug } from "@/hooks/api/useLocations";
import { useGetHallsForLocation } from "@/hooks/api/useHalls";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

export default function LocationPage() {
    const { slug } = useParams<{ slug: string }>();
    const locale = useLocale();
    const t = useTranslations("Location");
    const tSearch = useTranslations("Search");

    const [headerQuery, setHeaderQuery] = useState("");

    const { data: location, isLoading: locationLoading, isError } = useGetLocationBySlug(slug);
    const { data: locationHalls = [] } = useGetHallsForLocation(location?.id ?? "", {
        enabled: Boolean(location?.id),
    });

    const translation = useMemo(
        () => location?.translations.find((t) => t.languageCode === locale),
        [location, locale]
    );

    if (locationLoading) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <LoadingState message={t("loading")} />
            </>
        );
    }

    if (isError) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
                    <p className="text-muted-foreground text-sm">{t("error")}</p>
                </div>
            </>
        );
    }

    if (!location) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
                    <p className="text-muted-foreground text-sm">{t("notFound")}</p>
                </div>
            </>
        );
    }

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Hero banner */}
            <div className="relative h-[200px] w-full sm:h-[300px] md:h-[360px]">
                {location.coverImageUrl ? (
                    <Image
                        src={location.coverImageUrl}
                        alt={location.name ?? ""}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>

            <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-10 sm:py-12">
                <h1 className="font-display text-foreground text-[32px] leading-[1.1] font-bold tracking-[-0.03em] sm:text-[48px] md:text-[56px]">
                    {location.name}
                </h1>
                {location.address && (
                    <div className="text-muted-foreground mt-4 flex items-center gap-2">
                        <MapPin className="size-4 shrink-0" />
                        <span className="font-mono text-[11px] tracking-[1px] uppercase">
                            {location.address}
                        </span>
                    </div>
                )}
                {(location.phone1 || location.phone2) && (
                    <div className="text-muted-foreground mt-2 flex items-center gap-2">
                        <Phone className="size-4 shrink-0" />
                        <span className="font-mono text-[11px] tracking-[1px] uppercase">
                            {[location.phone1, location.phone2].filter(Boolean).join(" / ")}
                        </span>
                    </div>
                )}
                {translation?.description && (
                    <p className="font-body text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                        {translation.description}
                    </p>
                )}

                {/* History */}
                {translation?.history && (
                    <div className="mt-12">
                        <h2 className="text-muted-foreground mb-4 font-mono text-[10px] tracking-[1.6px] uppercase">
                            {t("history")}
                        </h2>
                        <p className="font-body text-foreground text-sm leading-relaxed sm:text-base">
                            {translation.history}
                        </p>
                    </div>
                )}

                {/* Halls */}
                {locationHalls.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-muted-foreground mb-6 font-mono text-[10px] tracking-[1.6px] uppercase">
                            {t("halls")}
                        </h2>
                        <MasonryGrid
                            items={locationHalls}
                            renderItem={(hall) => (
                                <div className="border-foreground/20 border">
                                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                                        <ImagePlaceholder className="h-full w-full" />
                                    </div>
                                    <div className="px-3 pt-3">
                                        <h2 className="font-display text-foreground text-[18px] leading-[1.15] font-bold tracking-[-0.02em]">
                                            {hall.name}
                                        </h2>
                                    </div>
                                    {hall.remark ? (
                                        <>
                                            <div className="border-foreground/10 mx-3 mt-3 border-t" />
                                            <p className="text-muted-foreground px-3 pt-2 pb-3 font-mono text-[11px] leading-snug break-words italic">
                                                {hall.remark}
                                            </p>
                                        </>
                                    ) : (
                                        <div className="pb-3" />
                                    )}
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
