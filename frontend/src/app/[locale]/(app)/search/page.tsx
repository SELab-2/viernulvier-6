"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { queryKeys } from "@/hooks/api/query-keys";
import type { Production } from "@/types/models/production.types";
import type { PaginatedResult, SearchPaginationParams } from "@/types/api/api.types";

import { UnifiedHeader } from "@/components/layout/header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

const ARCHIVE_MIN_YEAR = 1980;

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const heroObserverRef = useRef<IntersectionObserver | null>(null);
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isHeroVisible, setIsHeroVisible] = useState(true);

    const query = searchParams.get("q") ?? "";
    const dateFrom = searchParams.get("date_from") ?? undefined;
    const dateTo = searchParams.get("date_to") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;

    const { data: facets } = useGetFacets({ entityType: "production" });

    const facetParams = useMemo(
        () =>
            Object.fromEntries(
                (facets ?? []).flatMap(({ slug }) => {
                    const val = searchParams.get(slug);
                    return val ? [[slug, val]] : [];
                })
            ),
        [facets, searchParams]
    );

    const [draftQuery, setDraftQuery] = useState(query);

    // Reset cursor when any filter changes (including q)
    const filterKey = [
        query,
        ...(facets ?? []).map(({ slug }) => searchParams.get(slug) ?? ""),
        dateFrom,
        dateTo,
        sort,
    ].join("|");
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setDraftQuery(query);
        setCursorHistory([null]);
        setCurrentPageIndex(0);
    }

    const currentCursor = cursorHistory[currentPageIndex];

    const filterParams: SearchPaginationParams = useMemo(
        () => ({
            ...(query ? { q: query } : {}),
            ...facetParams,
            ...(dateFrom ? { date_from: dateFrom } : {}),
            ...(dateTo ? { date_to: dateTo } : {}),
            ...(sort ? { sort } : {}),
        }),
        [query, facetParams, dateFrom, dateTo, sort]
    );

    const handleSearch = useCallback(
        (value: string) => {
            const trimmed = value.trim();
            const params = new URLSearchParams(searchParams.toString());
            if (trimmed) {
                params.set("q", trimmed);
            } else {
                params.delete("q");
            }
            const qs = params.toString();
            router.push((qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.push>[0]);
        },
        [router, searchParams, pathname]
    );

    const handleSortChange = useCallback(
        (newSort: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", newSort);
            const qs = params.toString();
            router.replace(
                (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
            );
        },
        [router, searchParams, pathname]
    );

    const {
        data: productionsResult,
        isLoading: productionsLoading,
        isFetching,
    } = useGetProductions({
        params: {
            ...filterParams,
            ...(currentCursor ? { cursor: currentCursor } : {}),
        },
    });

    const nextCursor = productionsResult?.nextCursor;

    // Accumulate all fetched pages from TanStack Query cache
    const allProductions = useMemo(
        () =>
            cursorHistory.slice(0, currentPageIndex + 1).flatMap((cursor) => {
                const cached = queryClient.getQueryData<PaginatedResult<Production>>(
                    queryKeys.productions.all({
                        ...filterParams,
                        ...(cursor ? { cursor } : {}),
                    })
                );
                return cached?.data ?? [];
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cursorHistory, currentPageIndex, queryClient, productionsResult, filterParams]
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

    const heroRef = useCallback((node: HTMLDivElement | null) => {
        heroObserverRef.current?.disconnect();
        if (!node) return;
        heroObserverRef.current = new IntersectionObserver(
            (entries) => setIsHeroVisible(entries[0].isIntersecting),
            { threshold: 0 }
        );
        heroObserverRef.current.observe(node);
    }, []);

    return (
        <>
            <UnifiedHeader
                query={query}
                onQueryChange={() => {}}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero
                ref={heroRef}
                query={draftQuery}
                onQueryChange={setDraftQuery}
                onSearch={handleSearch}
            />

            <div
                className="flex min-h-[calc(100vh-300px)] overflow-hidden"
                style={{ ["--results-bar-height" as string]: "0px" }}
            >
                <ArchiveSidebar minYear={ARCHIVE_MIN_YEAR} />
                <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <ResultsBar
                        shownCount={allProductions.length}
                        totalCount={allProductions.length}
                        query={draftQuery}
                        onQueryChange={setDraftQuery}
                        showSearch={!isHeroVisible}
                        sort={sort}
                        onSortChange={handleSortChange}
                    />
                    {allProductions.length === 0 && !productionsLoading ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query })}
                            imagePath="/images/de_vooruit_decaying.png"
                            caption={t("articleImageCaption")}
                        />
                    ) : (
                        <ProductionList
                            productions={allProductions}
                            locale={locale}
                            isLoading={productionsLoading}
                        />
                    )}

                    {allProductions.length > 0 && nextCursor !== null && (
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
