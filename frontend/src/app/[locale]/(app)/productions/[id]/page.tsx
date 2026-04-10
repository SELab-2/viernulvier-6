"use client";

import { use, useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { notFound, useSearchParams } from "next/navigation";

import { useGetProduction, useGetProductions } from "@/hooks/api/useProductions";
import { useGetEventsByProduction } from "@/hooks/api/useEvents";
import { useHasPreview } from "@/hooks/usePreviewData";
import {
    useProductionWithPreview,
    useProductionEventsWithPreview,
} from "@/hooks/useProductionPreview";
import { Link, useRouter } from "@/i18n/routing";

import { SearchHeader } from "@/components/homepage/search-header";
import { LoadingState } from "@/components/shared/loading-state";
import { PreviewBadge } from "@/components/preview";

import { ProductionHero } from "@/components/productionpage/production-hero";
import { ProductionArticle } from "@/components/productionpage/production-article";
import { ProductionSidebar } from "@/components/productionpage/production-sidebar";
import { ProductionRelated } from "@/components/productionpage/production-related";
import { Production, ProductionRow } from "@/types/models/production.types";

// Helper to get title from Production or ProductionRow
function getProductionTitle(production: Production | ProductionRow, locale: string): string | null {
    // Check if it's ProductionRow (has titleNl/titleEn fields)
    if ("titleNl" in production || "titleEn" in production) {
        const row = production as ProductionRow;
        return locale === "en" ? row.titleEn : row.titleNl;
    }
    // It's Production (has translations array)
    const prod = production as Production;
    if (!prod.translations) return null;
    const translation = prod.translations.find(
        (t) => t.languageCode === (locale === "en" ? "en" : "nl")
    );
    return translation?.title ?? null;
}

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

    const searchParams = useSearchParams();
    const isPreviewMode = searchParams.get("preview") === "1";

    const { data: apiProduction, isLoading: isProdLoading, isError } = useGetProduction(id);
    const { data: apiEvents = [], isLoading: isEventsLoading } = useGetEventsByProduction(id);
    const { data: productionsResult, isLoading: isAllProdLoading } = useGetProductions();

    // Always call preview hooks (they handle preview mode internally)
    const previewProduction = useProductionWithPreview(id, apiProduction);
    const previewEvents = useProductionEventsWithPreview(id, apiEvents);
    const hasPreviewData = useHasPreview("production", id);

    // In preview mode, use preview data if available, otherwise fall back to API
    const production = isPreviewMode ? (previewProduction ?? apiProduction) : apiProduction;
    const events = isPreviewMode ? (previewEvents ?? apiEvents) : apiEvents;
    const isPreview = isPreviewMode && hasPreviewData;

    const isLoading = isProdLoading || isEventsLoading || isAllProdLoading;

    const relatedProductions = useMemo(() => {
        if (!productionsResult?.data || !production) return [];
        return productionsResult.data
            .filter(
                (p) => p.id !== production.id && p.uitdatabankType === production.uitdatabankType
            )
            .slice(0, 4);
    }, [productionsResult, production]);

    if (isError && !isPreview) {
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

    const title = getProductionTitle(production, locale) ?? production.slug;

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
                {isPreview && (
                    <>
                        <span className="opacity-50">/</span>
                        <PreviewBadge entityType="production" entityId={id} />
                    </>
                )}
            </div>

            {/* Hero */}
            <ProductionHero production={production as Production} locale={locale} />

            {/* Content Grid */}
            <div className="border-foreground flex min-h-[600px] flex-col border-b-2 lg:flex-row">
                <div className="border-border animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex-1 border-b p-6 pb-16 delay-150 duration-500 sm:p-10 lg:border-r lg:border-b-0 lg:pr-[50px]">
                    <ProductionArticle production={production as Production} locale={locale} />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex w-full shrink-0 flex-col gap-0 p-6 delay-200 duration-500 sm:p-[30px_24px] lg:w-[320px]">
                    <ProductionSidebar
                        production={production as Production}
                        events={events}
                        locale={locale}
                    />
                </div>
            </div>

            {/* Related Section */}
            {relatedProductions.length > 0 && (
                <ProductionRelated productions={relatedProductions} locale={locale} />
            )}
        </div>
    );
}
