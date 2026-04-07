"use client";

import { use, useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { notFound } from "next/navigation";

import { useGetProduction, useGetProductions } from "@/hooks/api/useProductions";
import { useGetEvents } from "@/hooks/api/useEvents";
import { getLocalizedField } from "@/lib/locale";
import { Link, useRouter } from "@/i18n/routing";

import { SearchHeader } from "@/components/homepage/search-header";
import { LoadingState } from "@/components/shared/loading-state";

import { ProductionHero } from "@/components/productionpage/production-hero";
import { ProductionArticle } from "@/components/productionpage/production-article";
import { ProductionSidebar } from "@/components/productionpage/production-sidebar";
import { ProductionRelated } from "@/components/productionpage/production-related";

export default function ProductionPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id } = use(params);
    const locale = useLocale();
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const [headerQuery, setHeaderQuery] = useState("");
    const handleHeaderSearch = useCallback(
        (value: string) => {
            if (value.trim()) {
                router.push(`/search?q=${encodeURIComponent(value.trim())}`);
            } else {
                router.push("/search");
            }
        },
        [router]
    );

    const { data: production, isLoading: isProdLoading, isError } = useGetProduction(id);
    const { data: allEvents, isLoading: isEventsLoading } = useGetEvents();
    const { data: allProductions, isLoading: isAllProdLoading } = useGetProductions();

    const isLoading = isProdLoading || isEventsLoading || isAllProdLoading;

    const events = useMemo(() => {
        if (!allEvents || !production) return [];
        return allEvents.filter((e) => e.productionId === production.id);
    }, [allEvents, production]);

    const relatedProductions = useMemo(() => {
        if (!allProductions || !production) return [];
        return allProductions
            .filter(
                (p) => p.id !== production.id && p.uitdatabankType === production.uitdatabankType
            )
            .slice(0, 4);
    }, [allProductions, production]);

    if (isError) {
        notFound();
    }

    if (isLoading || !production) {
        return (
            <>
                <SearchHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    onSearch={handleHeaderSearch}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <LoadingState message="Laden..." />
            </>
        );
    }

    const title = getLocalizedField(production, "title", locale) ?? production.slug;

    return (
        <div className="bg-background text-foreground font-body min-h-screen">
            <SearchHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Breadcrumb */}
            <div className="border-muted/25 text-muted-foreground flex items-center gap-2 border-b px-6 py-3 font-mono text-[9px] tracking-[1.4px] uppercase sm:px-10">
                <Link href="/search" className="hover:text-foreground transition-colors">
                    Archief
                </Link>
                <span className="opacity-50">/</span>
                <Link href="/search" className="hover:text-foreground transition-colors">
                    Producties
                </Link>
                <span className="opacity-50">/</span>
                <span className="text-foreground max-w-[200px] truncate">{title}</span>
            </div>

            {/* Hero */}
            <ProductionHero production={production} locale={locale} />

            {/* Content Grid */}
            <div className="border-foreground flex min-h-[600px] flex-col border-b-2 lg:flex-row">
                <div className="border-border animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex-1 border-b p-6 pb-16 delay-150 duration-500 sm:p-10 lg:border-r lg:border-b-0 lg:pr-[50px]">
                    <ProductionArticle production={production} locale={locale} />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex w-full shrink-0 flex-col gap-0 p-6 delay-200 duration-500 sm:p-[30px_24px] lg:w-[320px]">
                    <ProductionSidebar production={production} events={events} locale={locale} />
                </div>
            </div>

            {/* Related Section */}
            {relatedProductions.length > 0 && (
                <ProductionRelated productions={relatedProductions} locale={locale} />
            )}
        </div>
    );
}
