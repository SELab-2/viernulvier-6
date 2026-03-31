"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Phone, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { SearchHeader } from "@/components/homepage/search-header";
import { LoadingState } from "@/components/shared/loading-state";
import { useGetLocationBySlug } from "@/hooks/api/useLocations";
import { useGetSpaces } from "@/hooks/api/useSpaces";
import { useGetHalls } from "@/hooks/api/useHalls";

export default function LocationPage() {
    const { slug } = useParams<{ slug: string }>();
    const locale = useLocale();
    const t = useTranslations("Location");
    const tSearch = useTranslations("Search");

    const [headerQuery, setHeaderQuery] = useState("");

    const { data: location, isLoading: locationLoading, isError } = useGetLocationBySlug(slug);
    const { data: spaces = [] } = useGetSpaces();
    const { data: halls = [] } = useGetHalls();

    const locationHalls = useMemo(() => {
        if (!location) return [];
        const spaceIds = new Set(
            spaces.filter((s) => s.locationId === location.id).map((s) => s.id)
        );
        return halls.filter((h) => h.spaceId && spaceIds.has(h.spaceId));
    }, [location, spaces, halls]);

    const translation = useMemo(
        () => location?.translations.find((t) => t.languageCode === locale),
        [location, locale]
    );

    if (locationLoading) {
        return (
            <>
                <SearchHeader
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
                <SearchHeader
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
                <SearchHeader
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
            <SearchHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Hero banner */}
            <div className="h-[200px] w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4] sm:h-[300px] md:h-[360px]" />

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
                <button
                    onClick={() => toast.info(t("searchNotImplemented"))}
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-6 inline-flex items-center gap-2 border-2 px-5 py-2.5 font-mono text-[11px] tracking-[1.2px] uppercase transition-colors"
                >
                    {t("searchArchive")}
                    <ArrowRight className="size-4" />
                </button>

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
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                            {locationHalls.map((hall) => (
                                <div key={hall.id}>
                                    <div className="aspect-[4/3] max-w-[320px] bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                                    <h3 className="font-display text-foreground mt-4 text-lg font-semibold sm:text-xl">
                                        {hall.name}
                                    </h3>
                                    {hall.remark && (
                                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                            {hall.remark}
                                        </p>
                                    )}
                                    {(hall.seatSelection || hall.openSeating) && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            {hall.seatSelection && (
                                                <span className="border-border text-muted-foreground border px-1.5 py-px font-mono text-[9px] tracking-[1.4px] uppercase">
                                                    {t("seated")}
                                                </span>
                                            )}
                                            {hall.openSeating && (
                                                <span className="border-border text-muted-foreground border px-1.5 py-px font-mono text-[9px] tracking-[1.4px] uppercase">
                                                    {t("openSeating")}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
