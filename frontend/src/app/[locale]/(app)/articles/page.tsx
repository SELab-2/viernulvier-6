"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useGetArticles } from "@/hooks/api/useArticles";
import { groupArticlesByYearMonth } from "@/lib/articles";

import { ArticleCard, ScrollPositionSlider, type SliderItem } from "@/components/articles";
import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function ArticlesPage() {
    const locale = useLocale();
    const t = useTranslations("Articles");
    const tSearch = useTranslations("Search");
    const router = useRouter();

    const [headerQuery, setHeaderQuery] = useState("");
    const [currentSliderIndex, setCurrentSliderIndex] = useState(0);
    const [isSliderDragging, setIsSliderDragging] = useState(false);
    const observerLockRef = useRef(false);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const { data: articles, isLoading } = useGetArticles();

    const groupedArticles = useMemo(() => {
        if (!articles || articles.length === 0) return [];
        return groupArticlesByYearMonth(articles, locale);
    }, [articles, locale]);

    const sliderItems = useMemo<SliderItem[]>(() => {
        return groupedArticles.flatMap((yearGroup) => [
            {
                type: "year" as const,
                label: String(yearGroup.year),
            },
            ...yearGroup.months.map((monthGroup) => ({
                type: "month" as const,
                label: `${monthGroup.monthName} ${yearGroup.year}`,
            })),
        ]);
    }, [groupedArticles]);

    const sliderIndexMap = useMemo(() => {
        return new Map(sliderItems.map((item, index) => [item.label, index]));
    }, [sliderItems]);

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

    const handleNavigateToItem = useCallback(
        (index: number) => {
            const item = sliderItems[index];
            if (!item) return;

            setCurrentSliderIndex(index);

            const element = sectionRefs.current.get(item.label);
            if (element) {
                element.scrollIntoView({ behavior: "auto", block: "start" });
            }

            if (item.type === "year") {
                observerLockRef.current = true;
                setTimeout(() => {
                    observerLockRef.current = false;
                }, 300);
            }
        },
        [sliderItems]
    );

    useEffect(() => {
        if (sliderItems.length === 0) return;

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

                if (visibleMap.size > 0 && !isSliderDragging && !observerLockRef.current) {
                    let topLabel = "";
                    let topY = Infinity;

                    sectionRefs.current.forEach((el, key) => {
                        if (visibleMap.has(key)) {
                            const rect = el.getBoundingClientRect();
                            if (rect.top < topY) {
                                topY = rect.top;
                                topLabel = key;
                            }
                        }
                    });

                    if (topLabel) {
                        const sliderIndex = sliderIndexMap.get(topLabel);
                        if (sliderIndex !== undefined) {
                            setCurrentSliderIndex(sliderIndex);
                        }
                    }
                }
            },
            {
                rootMargin: "-10% 0px -70% 0px",
                threshold: [0, 0.1, 0.5, 1],
            }
        );

        sectionRefs.current.forEach((el) => observer.observe(el));

        return () => {
            observer.disconnect();
        };
    }, [sliderItems, isSliderDragging, sliderIndexMap]);

    const registerSection = (key: string) => (el: HTMLDivElement | null) => {
        if (el) {
            sectionRefs.current.set(key, el);
            el.setAttribute("data-label", key);
        } else {
            sectionRefs.current.delete(key);
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

            <section className="mx-auto w-full max-w-[1280px] px-3 py-8 sm:px-6 sm:py-12">
                {isLoading && <LoadingState message={t("loading")} />}

                {!isLoading && (!articles || articles.length === 0) && (
                    <VintageEmptyState
                        title={t("noArticlesTitle")}
                        description={t("noArticlesText")}
                    />
                )}

                {!isLoading && articles && articles.length > 0 && (
                    <>
                        <div className="text-muted-foreground border-muted/30 bg-background sticky top-0 z-30 -mx-3 mb-8 flex items-center gap-2.5 border-b px-3 py-3 font-mono text-[9px] font-medium tracking-[2px] uppercase sm:-mx-6 sm:px-6">
                            {t("listLabel", { count: articles.length })}
                        </div>

                        <div className="flex w-full items-start gap-6 sm:gap-12">
                            <div className="sticky top-[calc(0.75rem+0.75rem+0.875rem+1px+1rem)] z-20 hidden h-[85vh] min-h-112 shrink-0 self-start sm:block">
                                <ScrollPositionSlider
                                    sliderItems={sliderItems}
                                    currentIndex={currentSliderIndex}
                                    onNavigate={handleNavigateToItem}
                                    onDragChange={setIsSliderDragging}
                                />
                            </div>

                            <div className="border-muted/25 min-w-0 flex-1 space-y-8 sm:border-l sm:pl-4 md:pl-5">
                                {groupedArticles.map((yearGroup) => {
                                    const yearArticleCount = yearGroup.months.reduce(
                                        (sum, month) => sum + month.articles.length,
                                        0
                                    );

                                    return (
                                        <div key={yearGroup.year} className="w-full pb-8">
                                            <div className="mb-8 w-full">
                                                <div className="flex items-end justify-between gap-4">
                                                    <h2
                                                        ref={registerSection(
                                                            String(yearGroup.year)
                                                        )}
                                                        className="font-display text-foreground scroll-mt-20 text-[52px] leading-[0.9] font-black tracking-[-0.05em] sm:text-[68px] md:text-[84px]"
                                                    >
                                                        {yearGroup.year}
                                                    </h2>
                                                    <span className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[2px] whitespace-nowrap uppercase sm:text-[11px]">
                                                        {t("listLabel", {
                                                            count: yearArticleCount,
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full space-y-12">
                                                {yearGroup.months.map((monthGroup) => {
                                                    const label = `${monthGroup.monthName} ${yearGroup.year}`;

                                                    return (
                                                        <div
                                                            key={label}
                                                            ref={registerSection(label)}
                                                            className="w-full"
                                                        >
                                                            <div className="bg-background sticky top-[calc(2.5rem+1px)] z-10 mb-5 flex items-center gap-4 py-2">
                                                                <h3 className="text-foreground font-mono text-[11px] font-bold tracking-[4px] uppercase sm:text-[12px]">
                                                                    {monthGroup.monthName}
                                                                </h3>
                                                                <span className="bg-muted/40 h-px flex-1" />
                                                                <span className="text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase">
                                                                    {String(
                                                                        monthGroup.articles.length
                                                                    ).padStart(2, "0")}
                                                                </span>
                                                            </div>

                                                            <div className="w-full">
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
