"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
    const [currentLabel, setCurrentLabel] = useState<string>("");
    const [showIndicator, setShowIndicator] = useState(false);
    const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

                if (visibleMap.size > 0) {
                    let topLabel = "";
                    let topY = Infinity;
                    monthRefs.current.forEach((el, key) => {
                        if (visibleMap.has(key)) {
                            const rect = el.getBoundingClientRect();
                            if (rect.top < topY) {
                                topY = rect.top;
                                topLabel = key;
                            }
                        }
                    });
                    if (topLabel) setCurrentLabel(topLabel);
                }
            },
            { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.1, 0.5, 1] }
        );

        monthRefs.current.forEach((el) => observer.observe(el));

        const onScroll = () => {
            setShowIndicator(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => setShowIndicator(false), 800);
        };

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", onScroll);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [articles]);

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

            {/* Scroll indicator */}
            {currentLabel && (
                <div
                    className={`border-foreground bg-background text-foreground font-display pointer-events-none fixed top-1/2 right-4 z-50 -translate-y-1/2 border-2 px-4 py-2 text-[14px] font-bold shadow-lg transition-opacity duration-200 sm:right-8 sm:text-[16px] ${
                        showIndicator ? "opacity-100" : "opacity-0"
                    }`}
                >
                    {currentLabel}
                </div>
            )}

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
                        <div className="w-full space-y-8">
                            {groupArticlesByYearMonth(articles).map((yearGroup) => {
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
                                                                {monthGroup.articles.length} article
                                                                {monthGroup.articles.length !== 1
                                                                    ? "s"
                                                                    : ""}
                                                            </span>
                                                        </h3>
                                                        <div className="border-muted/35 w-full border-t">
                                                            {monthGroup.articles.map((article) => (
                                                                <ArticleCard
                                                                    key={article.id}
                                                                    article={article}
                                                                    locale={locale}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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
