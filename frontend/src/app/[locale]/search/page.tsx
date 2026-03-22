"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { getLocalizedField } from "@/lib/locale";

import { LoadingState } from "@/components/shared/loading-state";
import { SearchHeader } from "@/components/homepage/search-header";
import { SearchHero } from "@/components/homepage/search-hero";
import { ResultsBar } from "@/components/homepage/results-bar";
import { ArchiveSidebar } from "@/components/homepage/archive-sidebar";
import { ProductionList } from "@/components/homepage/production-list";
import { Pagination } from "@/components/homepage/pagination";

export default function SearchPage() {
    const locale = useLocale();
    const t = useTranslations("Search");
    const tHome = useTranslations("Home");
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

    const { data: productions, isLoading: productionsLoading } = useGetProductions();
    const { data: locations, isLoading: locationsLoading } = useGetLocations();

    const isLoading = productionsLoading || locationsLoading;

    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);

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

    return (
        <>
            <SearchHeader
                query={searchQuery}
                onQueryChange={setSearchQuery}
                searchPlaceholder={t("placeholder")}
                searchHint={t("hint")}
            />

            <SearchHero
                query={searchQuery}
                onQueryChange={setSearchQuery}
                productionCount={allProductions.length}
            />

            <ResultsBar shownCount={filteredProductions.length} totalCount={totalCount} />

            <div className="flex min-h-[calc(100vh-300px)] overflow-hidden">
                <ArchiveSidebar locations={locations ?? []} />
                <main className="min-w-0 flex-1 overflow-hidden">
                    <ProductionList productions={filteredProductions} locale={locale} />
                    {!searchQuery && totalPages > 1 && (
                        <Pagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </main>
            </div>
        </>
    );
}
