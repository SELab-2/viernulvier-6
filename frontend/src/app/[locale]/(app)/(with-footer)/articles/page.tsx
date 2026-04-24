"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useGetInfiniteArticles } from "@/hooks/api/useArticles";

import { UnifiedHeader } from "@/components/layout/header";
import { ArticleCard } from "@/components/articles";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function ArticlesPage() {
    const locale = useLocale();
    const t = useTranslations("Articles");
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const loadMoreRef = useRef<HTMLDivElement>(null);

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

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useGetInfiniteArticles();

    const articles = data?.pages.flatMap((page) => page.data) ?? [];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1, rootMargin: "100px" }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Hero */}
            <section className="border-foreground border-b-2 px-4 py-10 text-center sm:px-10 sm:py-14">
                <span className="text-muted-foreground mb-3 block font-mono text-[9px] tracking-[2px] uppercase">
                    {t("heroEyebrow")}
                </span>
                <h1 className="font-display text-foreground text-[36px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[52px] md:text-[64px]">
                    {t("heroTitle")}
                </h1>
                <p className="font-display text-muted-foreground mt-2 text-[18px] italic sm:text-[22px]">
                    {t("heroSubtitle")}
                </p>

                {/* Dateline bar */}
                <div className="border-foreground text-foreground mx-auto mt-6 flex max-w-[600px] items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                    <span>{t("datelineEdition")}</span>
                    <span>{t("datelineBrand")}</span>
                    <span>{t("datelinePrice")}</span>
                </div>
            </section>

            {/* Article list */}
            <section className="mx-auto max-w-[1000px] px-4 py-8 sm:px-10 sm:py-12">
                {isLoading && <LoadingState message={t("loading")} />}

                {!isLoading && (!articles || articles.length === 0) && (
                    <VintageEmptyState
                        title={t("noArticlesTitle")}
                        description={t("noArticlesText")}
                    />
                )}

                {!isLoading && articles && articles.length > 0 && (
                    <>
                        <div className="text-muted-foreground mb-4 flex items-center gap-2.5 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                            {t("listLabel", { count: articles.length })}
                            <span className="bg-muted/40 h-px flex-1" />
                        </div>
                        <div className="border-muted/35 grid grid-cols-1 border-t sm:grid-cols-2 lg:grid-cols-3">
                            {articles.map((article) => (
                                <ArticleCard key={article.id} article={article} locale={locale} />
                            ))}
                        </div>
                    </>
                )}

                {/* Infinite Scroll Trigger */}
                {hasNextPage && (
                    <div ref={loadMoreRef} className="mt-8 flex justify-center py-8">
                        {isFetchingNextPage && (
                            <div className="text-muted-foreground flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="font-mono text-xs tracking-wider uppercase">
                                    {t("loading")}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
}
