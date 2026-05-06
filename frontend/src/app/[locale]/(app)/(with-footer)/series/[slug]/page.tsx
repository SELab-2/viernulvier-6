"use client";

import { useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { useGetSeriesBySlug } from "@/hooks/api/useSeries";
import { useGetProductions } from "@/hooks/api/useProductions";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { SeriesViewToggle, SeriesViewMode } from "@/components/series/SeriesViewToggle";
import { EntityGrid } from "@/components/masonry/entity-grid";
import { ProductionList } from "@/components/searchpage/production-list/ProductionList";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";
import { EntityGridItem } from "@/types/models/collection.types";
import { UnifiedHeader } from "@/components/layout/header";
import { useRouter } from "@/i18n/routing";

export default function SeriesPage() {
    const params = useParams();
    const slug = params.slug as string;
    const locale = useLocale();
    const t = useTranslations("Series");
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const [viewMode, setViewMode] = useState<SeriesViewMode>("grid");
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

    const {
        data: series,
        isLoading: isSeriesLoading,
        error: seriesError,
    } = useGetSeriesBySlug(slug);
    const { data: productionsResult, isLoading: isProductionsLoading } = useGetProductions({
        params: { series: slug },
    });

    const productions = useMemo(() => productionsResult?.data ?? [], [productionsResult?.data]);

    const gridItems = useMemo<EntityGridItem[]>(() => {
        return productions.map((p, index) => ({
            id: p.id,
            contentType: "production",
            contentId: p.id,
            position: index,
            comment: null,
        }));
    }, [productions]);

    if (isSeriesLoading) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    onSearch={handleHeaderSearch}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <LoadingState message={t("loading")} />
            </>
        );
    }

    if (seriesError || !series) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    onSearch={handleHeaderSearch}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <VintageEmptyState title={t("notFoundTitle")} description={t("notFoundText")} />
            </>
        );
    }

    const hasProductions = productions.length > 0;

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />
            <article className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8">
                <SeriesHeader series={series} />

                <SeriesViewToggle mode={viewMode} onChange={setViewMode} />

                {isProductionsLoading && productions.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <LoadingState message={t("loading")} className="min-h-0" />
                    </div>
                ) : !hasProductions ? (
                    <VintageEmptyState
                        title={t("noProductions")}
                        description={t("noProductions")}
                    />
                ) : viewMode === "grid" ? (
                    <EntityGrid items={gridItems} />
                ) : (
                    <div className="border-muted border-t">
                        <ProductionList productions={productions} locale={locale} />
                    </div>
                )}
            </article>
        </>
    );
}
