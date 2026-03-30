"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { queryKeys } from "@/hooks/api/query-keys";
import type { Production } from "@/types/models/production.types";
import type { PaginatedResult } from "@/types/api/api.types";

import { LoadingState } from "@/components/shared/loading-state";
import { SearchHeader } from "@/components/homepage/search-header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

const ARCHIVE_MIN_YEAR = 1980;

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tHome = useTranslations("Home");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const currentCursor = cursorHistory[currentPageIndex];

    const {
        data: productionsResult,
        isLoading: productionsLoading,
        isFetching,
    } = useGetProductions({
        pagination: currentCursor ? { cursor: currentCursor } : undefined,
    });
    const { data: locationsResult, isLoading: locationsLoading } = useGetLocations();
    const { data: facets, isLoading: facetsLoading } = useGetFacets({
        entityType: "production",
    });

    const nextCursor = productionsResult?.nextCursor;
    const locationsData = useMemo(() => locationsResult?.data ?? [], [locationsResult?.data]);

    const isLoading = productionsLoading || locationsLoading || facetsLoading;

    // Derive accumulated productions from React Query cache for each fetched cursor.
    // Including productionsResult in deps triggers recalculation when the current page arrives.
    const allProductions = useMemo(
        () =>
            cursorHistory.slice(0, currentPageIndex + 1).flatMap((cursor) => {
                const pagination = cursor ? { cursor } : undefined;
                const cached = queryClient.getQueryData<PaginatedResult<Production>>(
                    queryKeys.productions.all(pagination)
                );
                return cached?.data ?? [];
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cursorHistory, currentPageIndex, queryClient, productionsResult]
    );

    const loadMore = useCallback(() => {
        if (nextCursor && !isFetching) {
            setCursorHistory((prev) => [...prev, nextCursor]);
            setCurrentPageIndex((prev) => prev + 1);
        }
    }, [nextCursor, isFetching]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0.1, rootMargin: "100px" }
        );
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [loadMore]);

    const maxYear = new Date().getFullYear();

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

    return (
        <>
            <SearchHeader
                query=""
                onQueryChange={() => {}}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero query="" onQueryChange={() => {}} />

            <ResultsBar shownCount={allProductions.length} totalCount={allProductions.length} />

            <div className="flex min-h-[calc(100vh-300px)] overflow-hidden">
                <ArchiveSidebar
                    locations={locationsData}
                    facets={facets ?? []}
                    minYear={ARCHIVE_MIN_YEAR}
                    maxYear={maxYear}
                />
                <main className="min-w-0 flex-1 overflow-hidden">
                    {allProductions.length === 0 && !isLoading ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query: "" })}
                            imagePath="/images/de_vooruit_decaying.png"
                            caption={t("articleImageCaption")}
                        />
                    ) : (
                        <ProductionList productions={allProductions} locale={locale} />
                    )}

                    {nextCursor !== null && (
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
                </main>
            </div>
        </>
    );
}
