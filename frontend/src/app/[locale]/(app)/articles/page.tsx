"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useGetArticles } from "@/hooks/api/useArticles";
import { groupArticlesByYearMonth } from "@/lib/utils";

import { UnifiedHeader } from "@/components/layout/header";
import { ArticleCard } from "@/components/articles";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function ArticlesPage() {
    const locale = useLocale();
    const t = useTranslations("Articles");
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const [headerQuery, setHeaderQuery] = useState("");
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

    const toggleMonth = useCallback((year: number, month: number) => {
        const key = `${year}-${month}`;
        setExpandedMonths((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }, []);

    const toggleYear = useCallback((year: number) => {
        setExpandedYears((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    }, []);

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

    const { data: articles, isLoading } = useGetArticles();

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
                        <div className="text-muted-foreground mb-6 flex items-center gap-2.5 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                            {t("listLabel", { count: articles.length })}
                            <span className="bg-muted/40 h-px flex-1" />
                        </div>
                        <div className="w-full min-w-[900px] space-y-8">
                            {groupArticlesByYearMonth(articles).map((yearGroup) => {
                                const yearArticleCount = yearGroup.months.reduce(
                                    (sum, month) => sum + month.articles.length,
                                    0
                                );
                                const isYearExpanded = expandedYears.has(yearGroup.year);
                                return (
                                    <div key={yearGroup.year} className="w-full min-w-[900px]">
                                        <h2
                                            onClick={() => toggleYear(yearGroup.year)}
                                            className="font-display text-foreground hover:text-muted-foreground mb-6 cursor-pointer text-[28px] font-bold transition-colors"
                                        >
                                            {yearGroup.year}{" "}
                                            <span className="text-muted-foreground text-[18px] font-normal">
                                                {yearArticleCount} article
                                                {yearArticleCount !== 1 ? "s" : ""}
                                            </span>
                                        </h2>
                                        {isYearExpanded && (
                                            <div className="border-muted/35 w-full min-w-[850px] overflow-hidden border-l pl-6">
                                                {yearGroup.months.map((monthGroup) => {
                                                    const monthKey = `${yearGroup.year}-${monthGroup.month}`;
                                                    const isExpanded = expandedMonths.has(monthKey);
                                                    return (
                                                        <div
                                                            key={monthKey}
                                                            className="mb-8 w-full min-w-[850px]"
                                                        >
                                                            <h3
                                                                onClick={() =>
                                                                    toggleMonth(
                                                                        yearGroup.year,
                                                                        monthGroup.month
                                                                    )
                                                                }
                                                                className="text-foreground font-display hover:text-muted-foreground mb-4 w-full cursor-pointer text-[18px] font-bold tracking-[-0.02em] transition-colors sm:text-[20px]"
                                                            >
                                                                {monthGroup.monthName}{" "}
                                                                <span className="text-muted-foreground text-[14px] font-normal">
                                                                    {monthGroup.articles.length}{" "}
                                                                    article
                                                                    {monthGroup.articles.length !==
                                                                    1
                                                                        ? "s"
                                                                        : ""}
                                                                </span>
                                                            </h3>
                                                            {isExpanded && (
                                                                <div className="border-muted/35 w-full min-w-[850px] border-t">
                                                                    {monthGroup.articles.map(
                                                                        (article) => (
                                                                            <ArticleCard
                                                                                key={article.id}
                                                                                article={article}
                                                                                locale={locale}
                                                                            />
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
        </>
    );
}
