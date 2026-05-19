"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetArtists } from "@/hooks/api/useArtists";
import { useGetInfiniteArticles } from "@/hooks/api/useArticles";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { queryKeys } from "@/hooks/api/query-keys";
import type { Production, ProductionSortOption } from "@/types/models/production.types";
import type { PaginatedResult, SearchPaginationParams } from "@/types/api/api.types";
import { getLocalizedField } from "@/lib/locale";

import { UnifiedHeader } from "@/components/layout/header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { ArticleList } from "@/components/searchpage/article-list";
import { ArtistList } from "@/components/searchpage/artist-list";
import { LocationList } from "@/components/searchpage/location-list";
import { SearchGrid, type SearchGridItem } from "@/components/searchpage/search-grid";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

const ARCHIVE_MIN_YEAR = 1980;
const SORT_VALUES: ProductionSortOption[] = ["recent", "oldest", "relevance"];

const CATEGORIES = ["productions", "artists", "locations", "articles"] as const;
const DEFAULT_CATEGORY_SET = new Set(["productions"]); // , "artists", "locations", "articles"

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tCategories = useTranslations("Sidebar.categories");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const heroObserverRef = useRef<IntersectionObserver | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isHeroVisible, setIsHeroVisible] = useState(true);

    const query = searchParams.get("q")?.trim() ?? "";
    const dateFrom = searchParams.get("date_from") ?? undefined;
    const dateTo = searchParams.get("date_to") ?? undefined;
    const rawSort = searchParams.get("sort");
    const sort =
        rawSort !== null && SORT_VALUES.includes(rawSort as ProductionSortOption)
            ? (rawSort as ProductionSortOption)
            : undefined;
    const locationFilter = searchParams.get("location") ?? undefined;
    const selectedCategories = useMemo(() => {
        const raw = searchParams.get("category");
        if (!raw) return new Set(DEFAULT_CATEGORY_SET);
        const parsed = raw.split(",").filter(Boolean);
        return parsed.length > 0 ? new Set(parsed) : new Set(DEFAULT_CATEGORY_SET);
    }, [searchParams]);
    const showProductions = selectedCategories.has("productions");
    const showArtists = selectedCategories.has("artists");
    const showLocations = selectedCategories.has("locations");
    const showArticles = selectedCategories.has("articles");
    const view = searchParams.get("view") === "grid" ? "grid" : "list";

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
        locationFilter,
        dateFrom,
        dateTo,
        sort,
    ].join("|");
    const prevFilterKeyRef = useRef(filterKey);
    useEffect(() => {
        if (filterKey !== prevFilterKeyRef.current) {
            prevFilterKeyRef.current = filterKey;
            setDraftQuery(query);
            setCursorHistory([null]);
            setCurrentPageIndex(0);
        }
    }, [filterKey, query]);

    const currentCursor = cursorHistory[currentPageIndex];

    const filterParams: SearchPaginationParams = useMemo(
        () => ({
            ...(query ? { q: query } : {}),
            ...facetParams,
            ...(locationFilter ? { location: locationFilter } : {}),
            ...(dateFrom ? { date_from: dateFrom } : {}),
            ...(dateTo ? { date_to: dateTo } : {}),
            ...(sort ? { sort } : {}),
        }),
        [query, facetParams, locationFilter, dateFrom, dateTo, sort]
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
        (newSort: ProductionSortOption) => {
            const params = new URLSearchParams(searchParams.toString());
            if (newSort === "relevance") {
                params.delete("sort");
            } else {
                params.set("sort", newSort);
            }
            const qs = params.toString();
            router.replace(
                (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
            );
        },
        [router, searchParams, pathname]
    );

    const handleViewChange = useCallback(
        (nextView: "list" | "grid") => {
            const params = new URLSearchParams(searchParams.toString());
            if (nextView === "grid") {
                params.set("view", "grid");
            } else {
                params.delete("view");
            }
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

    const { data: artistsResult, isLoading: artistsLoading } = useGetArtists({
        q: query || undefined,
    });

    const { data: locationSearchResult, isLoading: locationSearchLoading } = useGetLocations({
        pagination: query ? { q: query } : undefined,
    });

    const { data: articlesPages, isLoading: articlesLoading } = useGetInfiniteArticles({
        pagination: query ? { q: query } : undefined,
    });

    const nextCursor = productionsResult?.nextCursor;
    const artistsData = useMemo(() => artistsResult ?? [], [artistsResult]);
    const locationSearchData = useMemo(
        () => locationSearchResult?.data ?? [],
        [locationSearchResult?.data]
    );
    const articlesData = useMemo(
        () => articlesPages?.pages.flatMap((p) => p.data) ?? [],
        [articlesPages]
    );

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

    // The sidebar is sticky: without a max-height it would extend below the viewport with no
    // way to reach the bottom. max-h: calc(100vh - --container-top) caps it to the visible
    // portion at all times — before sticky (hero on screen) and after. CSS can't express
    // "100vh minus this element's current top offset", so we track it here.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            el.style.setProperty(
                "--container-top",
                `${Math.max(0, el.getBoundingClientRect().top)}px`
            );
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    const heroRef = useCallback((node: HTMLDivElement | null) => {
        heroObserverRef.current?.disconnect();
        if (!node) return;
        heroObserverRef.current = new IntersectionObserver(
            (entries) => setIsHeroVisible(entries[0].isIntersecting),
            { threshold: 0 }
        );
        heroObserverRef.current.observe(node);
    }, []);

    const isAnyLoading =
        productionsLoading || artistsLoading || locationSearchLoading || articlesLoading;

    const hasAnyResults =
        (showProductions && allProductions.length > 0) ||
        (showArtists && artistsData.length > 0) ||
        (showLocations && locationSearchData.length > 0) ||
        (showArticles && articlesData.length > 0);

    const gridItems = useMemo<SearchGridItem[]>(
        () => [
            ...(showProductions
                ? allProductions.map((production) => ({
                      id: `production-${production.id}`,
                      title:
                          getLocalizedField(production, "title", locale) ?? production.slug ?? null,
                      subtitle: getLocalizedField(production, "artist", locale),
                      description:
                          getLocalizedField(production, "descriptionShort", locale) ??
                          getLocalizedField(production, "tagline", locale) ??
                          getLocalizedField(production, "teaser", locale),
                      imageUrl: production.coverImageUrl,
                      href: `/productions/${production.id}`,
                      typeLabel: tCategories("productions"),
                      tags: production.tags,
                  }))
                : []),
            ...(showArtists
                ? artistsData.map((artist) => ({
                      id: `artist-${artist.id}`,
                      title: artist.name,
                      subtitle: artist.slug,
                      description: null,
                      imageUrl: artist.coverImageUrl,
                      href: `/artists/${artist.id}`,
                      typeLabel: tCategories("artists"),
                      tags: [],
                  }))
                : []),
            ...(showLocations
                ? locationSearchData.map((location) => ({
                      id: `location-${location.id}`,
                      title: location.name ?? location.address ?? null,
                      subtitle: [location.city, location.country].filter(Boolean).join(", "),
                      description:
                          location.translations.find((tr) => tr.languageCode === locale)
                              ?.description ??
                          location.translations.find((tr) => tr.description)?.description ??
                          null,
                      imageUrl: location.coverImageUrl,
                      href: location.slug ? `/locations/${location.slug}` : null,
                      typeLabel: tCategories("locations"),
                      tags: [],
                  }))
                : []),
            ...(showArticles
                ? articlesData.map((article) => ({
                      id: `article-${article.id}`,
                      title: article.title,
                      subtitle: article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString(
                                locale === "en" ? "en-GB" : "nl-BE",
                                {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                }
                            )
                          : null,
                      description: null,
                      imageUrl: article.coverImageUrl,
                      href: `/articles/${article.slug}`,
                      typeLabel: tCategories("articles"),
                      tags: article.tags,
                  }))
                : []),
        ],
        [
            showProductions,
            allProductions,
            locale,
            tCategories,
            showArtists,
            artistsData,
            showLocations,
            locationSearchData,
            showArticles,
            articlesData,
        ]
    );

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
                ref={containerRef}
                className="flex min-h-[calc(100vh-300px)] items-start"
                style={{ ["--results-bar-height" as string]: "0px" }}
            >
                <ArchiveSidebar
                    minYear={ARCHIVE_MIN_YEAR}
                    categories={CATEGORIES}
                    defaultCategories={DEFAULT_CATEGORY_SET}
                    initialTag={searchParams.get("tag") ?? undefined}
                />
                <main className="flex min-w-0 flex-1 flex-col">
                    <ResultsBar
                        query={draftQuery}
                        onQueryChange={setDraftQuery}
                        onSearch={handleSearch}
                        showSearch={!isHeroVisible}
                        sort={sort ?? "relevance"}
                        onSortChange={handleSortChange}
                        view={view}
                        onViewChange={handleViewChange}
                    />

                    {!hasAnyResults && !isAnyLoading ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query })}
                            imagePath="/images/de_vooruit_decaying.png"
                            caption={t("articleImageCaption")}
                        />
                    ) : view === "grid" ? (
                        <SearchGrid items={gridItems} locale={locale} />
                    ) : (
                        <>
                            {showProductions && (
                                <ProductionList
                                    productions={allProductions}
                                    locale={locale}
                                    isLoading={productionsLoading}
                                />
                            )}

                            {showArtists && (
                                <ArtistList artists={artistsData} isLoading={artistsLoading} />
                            )}

                            {showLocations && (
                                <LocationList
                                    locations={locationSearchData}
                                    isLoading={locationSearchLoading}
                                />
                            )}

                            {showArticles && (
                                <ArticleList
                                    articles={articlesData}
                                    locale={locale}
                                    isLoading={articlesLoading}
                                />
                            )}
                        </>
                    )}

                    {showProductions && allProductions.length > 0 && nextCursor !== null && (
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
