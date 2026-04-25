"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import Link from "next/link";

import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetArticles } from "@/hooks/api/useArticles";

import { UnifiedHeader } from "@/components/layout/header";
import { SearchBar } from "@/components/homepage/search-bar";
import { FeaturedSection } from "@/components/homepage/featured-section";
import { ArticlesSection } from "@/components/homepage/articles-section";
import { ProductionItem } from "@/components/searchpage/production-list";

export default function HomePage() {
    const locale = useLocale();
    const t = useTranslations("Home");
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

    const handleHeroSearch = useCallback(
        (query: string) => {
            if (query.trim()) {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            } else {
                router.push("/search");
            }
        },
        [router]
    );

    const { data: productionsResult } = useGetProductions();
    const productions = productionsResult?.data ?? [];
    const featuredProductions = productions.slice(0, 3);
    const latestProductions = productions.slice(3, 7);

    const { data: articles } = useGetArticles();

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            <section className="flex flex-col items-center gap-6 px-4 py-16 text-center sm:px-10 sm:py-24">
                <h1 className="font-display text-foreground text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[64px] md:text-[72px]">
                    {t("hero.title")}
                </h1>
                <p className="text-muted-foreground font-body max-w-[480px] text-sm leading-relaxed sm:text-base">
                    {t("hero.subtitle")}
                </p>

                <SearchBar onSearch={handleHeroSearch} placeholder={t("hero.searchPlaceholder")} />
            </section>

            <section className="px-4 pt-8 sm:px-[30px] sm:pt-12">
                <FeaturedSection productions={featuredProductions} locale={locale} />
            </section>

            <section className="px-4 pt-10 sm:px-[30px] sm:pt-14">
                <ArticlesSection articles={articles ?? []} />
            </section>

            {latestProductions.length > 0 && (
                <section className="px-4 py-10 sm:px-[30px] sm:py-14">
                    <div className="mb-6 flex items-baseline justify-between">
                        <h3 className="font-display text-foreground text-[20px] font-bold tracking-[-0.02em] sm:text-[24px]">
                            {t("latest.label")}
                        </h3>
                        <Link
                            href="/search"
                            className="text-muted-foreground hover:text-foreground font-mono text-[9px] tracking-[1.4px] uppercase transition-colors"
                        >
                            {t("latest.viewAll")}
                        </Link>
                    </div>
                    <div className="border-muted/35 border">
                        {latestProductions.map((production) => (
                            <ProductionItem
                                key={production.id}
                                production={production}
                                locale={locale}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="border-foreground/10 flex flex-col items-center gap-5 border-t px-4 py-14 text-center sm:px-10 sm:py-20">
                <h3 className="font-display text-foreground text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
                    {t("about.title")}
                </h3>
                <p className="text-muted-foreground font-body max-w-[480px] text-sm leading-relaxed">
                    {t("about.text")}
                </p>
            </section>
        </>
    );
}
