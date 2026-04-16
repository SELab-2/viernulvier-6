"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useGetArticles } from "@/hooks/api/useArticles";
import { groupArticlesByYearMonth } from "@/lib/utils";

import { UnifiedHeader } from "@/components/layout/header";
import { ArticleCard, ScrollPositionSlider } from "@/components/articles";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function ArticlesPage() {
    const locale = useLocale();
    const t = useTranslations("Articles");
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const [headerQuery, setHeaderQuery] = useState("");
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [isSliderDragging, setIsSliderDragging] = useState(false);
    const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const { data: articles, isLoading } = useGetArticles();

    const groupedArticles = useMemo(() => {
        if (!articles || articles.length === 0) return [];
        return groupArticlesByYearMonth(articles);
    }, [articles]);

    const monthsList = useMemo(() => {
        return groupedArticles.flatMap((yearGroup) =>
            yearGroup.months.map((monthGroup) => `${monthGroup.monthName} ${yearGroup.year}`)
        );
    }, [groupedArticles]);

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

    const handleNavigateToMonth = useCallback(
        (index: number) => {
            setCurrentMonthIndex(index);
            const monthLabel = monthsList[index];
            const element = monthRefs.current.get(monthLabel);
            if (element) {
                element.scrollIntoView({ behavior: "auto", block: "start" });
            }
        },
        [monthsList]
    );

    useEffect(() => {
        if (!articles || articles.length === 0) return;

        const visibleMap = new Map<string, number>();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const label = entry.target.getAttribute("data-label") || "";
                    if (entry.isIntersecting) {
                        visibleMap.set(label, entry.intersectionRatio);
                    } else {
                        visibleMap.delete(label);
                    }
                });

                if (visibleMap.size > 0 && !isSliderDragging) {
                    let topLabel = "";
                    let topY = Infinity;
                    let topIndex = 0;

                    monthRefs.current.forEach((el, key) => {
                        if (visibleMap.has(key)) {
                            const rect = el.getBoundingClientRect();
                            if (rect.top < topY) {
                                topY = rect.top;
                                topLabel = key;
                                topIndex = monthsList.indexOf(key);
                            }
                        }
                    });

                    if (topLabel) {
                        setCurrentMonthIndex(Math.max(0, topIndex));
                    }
                }
            },
            { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.1, 0.5, 1] }
        );

        monthRefs.current.forEach((el) => observer.observe(el));

        return () => {
            observer.disconnect();
        };
    }, [articles, isSliderDragging, monthsList]);

    const registerMonth = (key: string) => (el: HTMLDivElement | null) => {
        if (el) {
            monthRefs.current.set(key, el);
            el.setAttribute("data-label", key);
        } else {
            monthRefs.current.delete(key);
        }
    };

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

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

                <div className="border-foreground text-foreground mx-auto mt-6 flex max-w-[600px] items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                    <span>{t("datelineEdition")}</span>
                    <span>{t("datelineBrand")}</span>
                    <span>{t("datelinePrice")}</span>
                </div>
            </section>

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
                        <div className="text-muted-foreground border-muted/30 bg-background sticky top-0 z-30 -mx-4 mb-6 flex items-center gap-2.5 border-b px-4 py-3 font-mono text-[9px] font-medium tracking-[2px] uppercase sm:-mx-10 sm:px-10">
                            {t("listLabel", { count: articles.length })}
                            <span className="bg-muted/40 h-px min-w-0 flex-1" />
                        </div>

                        <div className="flex w-full items-start gap-7 sm:gap-12">
                            <div className="sticky top-[calc(0.75rem+0.75rem+0.875rem+1px+1rem)] z-20 -ml-2 hidden h-[85vh] min-h-112 shrink-0 self-start sm:-ml-4 sm:block">
                                <ScrollPositionSlider
                                    months={monthsList}
                                    currentIndex={currentMonthIndex}
                                    onNavigate={handleNavigateToMonth}
                                    onDragChange={setIsSliderDragging}
                                />
                            </div>

                            <div className="min-w-0 flex-1 space-y-8">
                                {groupedArticles.map((yearGroup) => {
                                    const yearArticleCount = yearGroup.months.reduce(
                                        (sum, month) => sum + month.articles.length,
                                        0
                                    );

                                    return (
                                        <div key={yearGroup.year} className="w-full">
                                            <h2 className="font-display text-foreground mb-6 text-[28px] font-bold">
                                                {yearGroup.year}{" "}
                                                <span className="text-muted-foreground text-[18px] font-normal">
                                                    {yearArticleCount} article
                                                    {yearArticleCount !== 1 ? "s" : ""}
                                                </span>
                                            </h2>

                                            <div className="border-muted/35 w-full border-l pl-6">
                                                {yearGroup.months.map((monthGroup) => {
                                                    const label = `${monthGroup.monthName} ${yearGroup.year}`;

                                                    return (
                                                        <div
                                                            key={label}
                                                            ref={registerMonth(label)}
                                                            className="mb-8 w-full"
                                                        >
                                                            <h3 className="text-foreground font-display mb-4 w-full text-[18px] font-bold tracking-[-0.02em] sm:text-[20px]">
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

                                                            <div className="border-muted/35 w-full border-t">
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
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}
