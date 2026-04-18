"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { queryKeys } from "@/hooks/api/query-keys";
import type { Production } from "@/types/models/production.types";
import type { PaginatedResult } from "@/types/api/api.types";

import { LoadingState } from "@/components/shared/loading-state";
import { UnifiedHeader } from "@/components/layout/header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tHome = useTranslations("Home");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const query = searchParams.get("q")?.trim() ?? "";
    const [draftQuery, setDraftQuery] = useState(query);
    const [prevQuery, setPrevQuery] = useState(query);

    if (query !== prevQuery) {
        setPrevQuery(query);
        setDraftQuery(query);
        setCursorHistory([null]);
        setCurrentPageIndex(0);
    }

    const currentCursor = cursorHistory[currentPageIndex];

    const handleSearch = useCallback(
        (value: string) => {
            const trimmed = value.trim();
            if (trimmed) {
                router.push(`/search?q=${encodeURIComponent(trimmed)}`);
            } else {
                router.push("/search");
            }
        },
        [router]
    );

    const {
        data: productionsResult,
        isLoading: productionsLoading,
        isFetching,
    } = useGetProductions({
        params: {
            ...(query ? { q: query } : {}),
            ...(currentCursor ? { cursor: currentCursor } : {}),
        },
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
                    queryKeys.productions.all({
                        ...(query ? { q: query } : {}),
                        ...(pagination ?? {}),
                    })
                );
                return cached?.data ?? [];
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cursorHistory, currentPageIndex, queryClient, productionsResult, query]
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

    if (isLoading && allProductions.length === 0) {
        return (
            <>
                <UnifiedHeader
                    query={query}
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
            <UnifiedHeader
                query={query}
                onQueryChange={() => {}}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero query={draftQuery} onQueryChange={setDraftQuery} onSearch={handleSearch} />

            <ResultsBar shownCount={allProductions.length} totalCount={allProductions.length} />

            <div className="flex min-h-[calc(100vh-300px)] overflow-hidden">
                <ArchiveSidebar locations={locationsData} facets={facets ?? []} />
                <main className="min-w-0 flex-1 overflow-hidden">
                    {allProductions.length === 0 && !isLoading ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query })}
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
