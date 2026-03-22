"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { getLocalizedField } from "@/lib/locale";

import { LoadingState } from "@/components/shared/loading-state";
import { Masthead } from "@/components/homepage/masthead";
import { SearchBar } from "@/components/homepage/search-bar";
import { FeaturedSection } from "@/components/homepage/featured-section";
import { ArchiveSidebar } from "@/components/homepage/archive-sidebar";
import { ProductionList } from "@/components/homepage/production-list";
import { Pagination } from "@/components/homepage/pagination";

export default function HomePage() {
    const locale = useLocale();
    const t = useTranslations("Home");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: productions, isLoading: productionsLoading } = useGetProductions();
    const { data: locations, isLoading: locationsLoading } = useGetLocations();

    const isLoading = productionsLoading || locationsLoading;

    // TODO: implement pagination with API (page/limit params) when backend supports it
    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);

    if (isLoading) {
        return (
            <>
                <Masthead />
                <LoadingState message={t("loading")} />
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

    return (
        <>
            <Masthead />
            <SearchBar onSearch={setSearchQuery} />

            <div className="px-[30px]">
                <FeaturedSection />
            </div>

            <div className="flex min-h-[calc(100vh-200px)]">
                <ArchiveSidebar locations={locations ?? []} />
                <main className="min-w-0 flex-1 px-[30px] pb-16">
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
