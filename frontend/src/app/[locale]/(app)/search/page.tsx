"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetEvents } from "@/hooks/api/useEvents";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import type { Event } from "@/types/models/event.types";
import { getLocalizedField } from "@/lib/locale";

import { LoadingState } from "@/components/shared/loading-state";
import { SearchHeader } from "@/components/homepage/search-header";
import { SearchHero } from "@/components/searchpage/search-hero";
import { ResultsBar } from "@/components/searchpage/results-bar";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar";
import { ProductionList } from "@/components/searchpage/production-list";
import { Pagination } from "@/components/searchpage/pagination";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tHome = useTranslations("Home");
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

    const { data: productions, isLoading: productionsLoading } = useGetProductions();
    const { data: events, isLoading: eventsLoading } = useGetEvents();
    const { data: locations, isLoading: locationsLoading } = useGetLocations();
    const { data: facets, isLoading: facetsLoading } = useGetFacets({
        entityType: "production",
    });

    const isLoading = productionsLoading || eventsLoading || locationsLoading || facetsLoading;

    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);

    const eventsByProduction = useMemo(() => {
        const map = new Map<string, Event[]>();
        (events ?? []).forEach((event) => {
            const existing = map.get(event.productionId) ?? [];
            existing.push(event);
            map.set(event.productionId, existing);
        });
        return map;
    }, [events]);

    if (isLoading) {
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

    const allProductions = productions ?? [];
    const totalPages = Math.max(1, Math.ceil(allProductions.length / ITEMS_PER_PAGE));
    const pagedProductions = allProductions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const filteredProductions = searchQuery
        ? allProductions.filter((p) => {
              const title = getLocalizedField(p, "title", locale) ?? p.slug;
              const artist = getLocalizedField(p, "artist", locale) ?? "";
              const text = `${title} ${artist} ${p.slug}`.toLowerCase();
              return text.includes(searchQuery.toLowerCase());
          })
        : pagedProductions;

    const totalCount = searchQuery ? filteredProductions.length : allProductions.length;
    const hasNoResults = searchQuery && filteredProductions.length === 0;

    return (
        <>
            <SearchHeader
                query={searchQuery}
                onQueryChange={setSearchQuery}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero query={searchQuery} onQueryChange={setSearchQuery} />

            <ResultsBar shownCount={filteredProductions.length} totalCount={totalCount} />

            <div className="flex min-h-[calc(100vh-300px)] overflow-hidden">
                <ArchiveSidebar locations={locations ?? []} facets={facets ?? []} />
                <main className="min-w-0 flex-1 overflow-hidden">
                    {hasNoResults ? (
                        <VintageEmptyState
                            title={t("noResultsTitle")}
                            description={t("noResultsText", { query: searchQuery })}
                            imagePath="/images/de_vooruit_decaying.png"
                        />
                    ) : (
                        <>
                            <ProductionList
                                productions={filteredProductions}
                                locale={locale}
                                eventsByProduction={eventsByProduction}
                            />
                            {!searchQuery && totalPages > 1 && (
                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </>
    );
}
