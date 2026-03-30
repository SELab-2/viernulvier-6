"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetEvents } from "@/hooks/api/useEvents";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";
import { getLocalizedField } from "@/lib/locale";

import { LoadingState } from "@/components/shared/loading-state";
import { SearchHeader } from "@/components/homepage/search-header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tHome = useTranslations("Home");
    const searchParams = useSearchParams();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

    // Cursor-based pagination state
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [allProductions, setAllProductions] = useState<Production[]>([]);

    const currentCursor = cursorHistory[currentPageIndex];

    const {
        data: productionsResult,
        isLoading: productionsLoading,
        isFetching,
    } = useGetProductions({
        pagination: currentCursor ? { cursor: currentCursor } : undefined,
    });
    const { data: eventsResult, isLoading: eventsLoading } = useGetEvents();
    const { data: locationsResult, isLoading: locationsLoading } = useGetLocations();
    const { data: facets, isLoading: facetsLoading } = useGetFacets({
        entityType: "production",
    });

    // Memoize data arrays to prevent dependency issues
    const productionsData = useMemo(() => productionsResult?.data ?? [], [productionsResult?.data]);
    const nextCursor = productionsResult?.nextCursor;
    const eventsData = useMemo(() => eventsResult?.data ?? [], [eventsResult?.data]);
    const locationsData = useMemo(() => locationsResult?.data ?? [], [locationsResult?.data]);

    const isLoading = productionsLoading || eventsLoading || locationsLoading || facetsLoading;

    // Accumulate productions when new page loads - defer setState to avoid cascade
    useEffect(() => {
        if (productionsData.length > 0 && currentPageIndex === cursorHistory.length - 1) {
            const timeoutId = setTimeout(() => {
                setAllProductions((prev) => {
                    const newIds = new Set(productionsData.map((p) => p.id));
                    const filtered = prev.filter((p) => !newIds.has(p.id));
                    return [...filtered, ...productionsData];
                });
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [productionsData, currentPageIndex, cursorHistory.length]);

    // Memoize eventsByProduction to prevent dependency issues
    const eventsByProduction = useMemo(() => {
        const map = new Map<string, Event[]>();
        eventsData.forEach((event) => {
            const existing = map.get(event.productionId) ?? [];
            existing.push(event);
            map.set(event.productionId, existing);
        });
        return map;
    }, [eventsData]);

    const loadMore = useCallback(() => {
        if (nextCursor && !isFetching) {
            setCursorHistory((prev) => [...prev, nextCursor]);
            setCurrentPageIndex((prev) => prev + 1);
        }
    }, [nextCursor, isFetching]);

    const handleReset = useCallback(() => {
        setCursorHistory([null]);
        setCurrentPageIndex(0);
        setAllProductions([]);
    }, []);

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        if (searchQuery) return; // Disable infinite scroll when searching

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: "100px" }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [loadMore, searchQuery]);

    if (isLoading && allProductions.length === 0) {
        return (
            <>
                <SearchHeader
                    query=""
                    onQueryChange={() => {}}
                    searchPlaceholder={t("placeholder")}
                    searchHint={t("hint")}
                />
                <LoadingState message={tHome("loading")} />
            </>
        );
    }

    // Use accumulated productions for display
    const filteredProductions = searchQuery
        ? allProductions.filter((p) => {
              const title = getLocalizedField(p, "title", locale) ?? p.slug;
              const artist = getLocalizedField(p, "artist", locale) ?? "";
              const text = `${title} ${artist} ${p.slug}`.toLowerCase();
              return text.includes(searchQuery.toLowerCase());
          })
        : allProductions;

    const totalCount = allProductions.length;
    const hasNoResults = searchQuery && filteredProductions.length === 0;
    const hasMore = !searchQuery && nextCursor !== null;

    return (
        <>
            <SearchHeader
                query={searchQuery}
                onQueryChange={(value) => {
                    setSearchQuery(value);
                    if (!value) handleReset();
                }}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero query={searchQuery} onQueryChange={setSearchQuery} />

            <ResultsBar shownCount={filteredProductions.length} totalCount={totalCount} />

            <div className="flex min-h-[calc(100vh-300px)] overflow-hidden">
                <ArchiveSidebar locations={locationsData} facets={facets ?? []} />
                <main className="min-w-0 flex-1 overflow-hidden">
                    {hasNoResults ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query: searchQuery })}
                            imagePath="/images/de_vooruit_decaying.png"
                            caption={t("articleImageCaption")}
                        />
                    ) : (
                        <>
                            <ProductionList
                                productions={filteredProductions}
                                locale={locale}
                                eventsByProduction={eventsByProduction}
                            />
                            {/* Infinite scroll sentinel */}
                            {hasMore && (
                                <div ref={loadMoreRef} className="flex justify-center py-8">
                                    {isFetching && (
                                        <div className="text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="font-mono text-xs tracking-wider uppercase">
                                                {t("loading")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </>
    );
}
