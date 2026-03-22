"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";

import { useGetProductions } from "@/hooks/api/useProductions";

import { SearchHeader } from "@/components/homepage/search-header";
import { FeaturedSection } from "@/components/homepage/featured-section";
import { ProductionItem } from "@/components/homepage/production-list";

export default function HomePage() {
    const locale = useLocale();
    const t = useTranslations("Home");
    const tSearch = useTranslations("Search");
    const router = useRouter();
    const [query, setQuery] = useState("");

    // Sync search header with hero input
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

    const handleHeroSearch = useCallback(() => {
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        } else {
            router.push("/search");
        }
    }, [query, router]);

    const { data: productions } = useGetProductions();
    const latestProductions = (productions ?? []).slice(0, 4);

    return (
        <>
            <SearchHeader
                query=""
                onQueryChange={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Hero */}
            <section className="border-muted/30 flex flex-col items-center gap-6 border-b px-4 py-16 text-center sm:px-10 sm:py-24">
                <h1 className="font-display text-foreground text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[64px] md:text-[72px]">
                    {t("hero.title")}
                </h1>
                <p className="text-muted-foreground font-body max-w-[480px] text-sm leading-relaxed sm:text-base">
                    {t("hero.subtitle")}
                </p>

                {/* Search CTA — same style as search page hero */}
                <div className="relative w-full max-w-[680px]">
                    <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-5 w-5 -translate-y-1/2 fill-none stroke-[1.5]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleHeroSearch();
                        }}
                        placeholder={t("hero.searchPlaceholder")}
                        autoComplete="off"
                        className="border-foreground font-display text-foreground placeholder:text-muted-foreground w-full border-b-2 bg-transparent pr-24 pb-3 pl-[34px] text-[18px] font-normal outline-none placeholder:italic sm:pr-28 sm:text-[22px]"
                    />
                    <button
                        onClick={handleHeroSearch}
                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 flex -translate-y-1/2 cursor-pointer items-center gap-1.5 font-mono text-[9px] tracking-[1.2px] uppercase"
                    >
                        enter{" "}
                        <kbd className="border-border text-muted-foreground flex items-center justify-center border px-[5px] py-0.5 font-mono text-[9px]">
                            ↵
                        </kbd>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {["theater", "dance", "concert", "nightlife"].map((tag) => (
                        <Link
                            key={tag}
                            href={`/search?q=${t(`tags.${tag}`)}`}
                            className="border-border text-muted-foreground hover:border-foreground hover:text-foreground border px-3 py-1.5 font-mono text-[9px] tracking-[1.1px] uppercase transition-all sm:text-[10px]"
                        >
                            {t(`tags.${tag}`)}
                        </Link>
                    ))}
                </div>
            </section>

            {/* Featured */}
            <section className="px-4 pt-8 sm:px-[30px] sm:pt-12">
                <FeaturedSection />
            </section>

            {/* Latest productions */}
            {latestProductions.length > 0 && (
                <section className="border-muted/30 border-t px-4 py-10 sm:px-[30px] sm:py-14">
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

            {/* About */}
            <section className="border-foreground/10 flex flex-col items-center gap-5 border-t px-4 py-14 text-center sm:px-10 sm:py-20">
                <h3 className="font-display text-foreground text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
                    {t("about.title")}
                </h3>
                <p className="text-muted-foreground font-body max-w-[480px] text-sm leading-relaxed">
                    {t("about.text")}
                </p>
                <span className="text-muted-foreground font-mono text-[9px] tracking-[1.4px] uppercase sm:text-[10px]">
                    {t("about.address")}
                </span>
            </section>
        </>
    );
}
