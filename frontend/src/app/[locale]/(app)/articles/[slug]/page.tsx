"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Image from "next/image";
import { useGetArticleBySlug } from "@/hooks/api/useArticles";
import { useGetEntityMedia } from "@/hooks/api/useMedia";
import { Link } from "@/i18n/routing";

import { SearchHeader } from "@/components/homepage/search-header";
import { TiptapRenderer } from "@/components/articles";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

function formatDate(dateStr: string, locale: string): string {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// TODO: replace with real data from API when backend supports public article relations
const STATIC_CONNECTED_ENTITIES = [
    { type: "Productie", label: "The Second Woman — Natali Broods" },
    { type: "Locatie", label: "De Vooruit — Domzaal" },
    { type: "Artiest", label: "Natali Broods" },
];

const STATIC_RELATED_ARTICLES = [
    { title: "De Balzaal door de jaren heen", period: "1960 — 1980", date: "12 mrt 2026" },
    { title: "Achter de schermen van Fresh Juice", period: "Voorjaar 2026", date: "28 feb 2026" },
    { title: "40 jaar Nightlife in De Vooruit", period: "1983 — 2023", date: "15 jan 2026" },
];

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const locale = useLocale();
    const t = useTranslations("Articles");
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

    const { data: article, isLoading, isError } = useGetArticleBySlug(slug);

    const { data: inlineMedia = [] } = useGetEntityMedia("article", article?.id ?? "", {
        enabled: !!article?.id,
        params: { role: "inline" },
    });

    const { data: coverMedia = [] } = useGetEntityMedia("article", article?.id ?? "", {
        enabled: !!article?.id,
        params: { role: "cover" },
    });
    const coverImage = coverMedia[0] ?? null;

    const mediaMap = useMemo(
        () => Object.fromEntries(inlineMedia.map((m) => [m.id, m.url ?? ""])),
        [inlineMedia]
    );

    return (
        <>
            <SearchHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {isLoading && <LoadingState message={t("loading")} />}

            {isError && (
                <VintageEmptyState title={t("notFoundTitle")} description={t("notFoundText")} />
            )}

            {!isLoading && article && (
                <article className="mx-auto max-w-[1100px] px-4 py-8 sm:px-10 sm:py-12">
                    {/* Back link */}
                    <Link
                        href="/articles"
                        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        {t("backToArticles")}
                    </Link>

                    {/* Article header */}
                    <header className="mb-8 pb-6">
                        <h1 className="font-display text-foreground text-[32px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[44px] md:text-[56px]">
                            {article.title ?? t("untitled")}
                        </h1>

                        {/* Dateline bar */}
                        <div className="border-foreground text-foreground mt-6 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                            <span>
                                {formatDate(article.publishedAt ?? article.createdAt, locale)}
                            </span>
                            <span>{t("datelineBrand")}</span>
                        </div>

                        {/* Cover image */}
                        {coverImage?.url && (
                            <div className="relative mt-6 aspect-[16/7] overflow-hidden">
                                <Image
                                    src={coverImage.url}
                                    alt={
                                        coverImage.altTextNl ??
                                        coverImage.altTextEn ??
                                        article.title ??
                                        ""
                                    }
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 768px) 100vw, 1100px"
                                />
                                {coverImage.creditNl && (
                                    <span className="bg-background/70 absolute right-2 bottom-2 px-1.5 py-0.5 font-mono text-[9px] tracking-wide">
                                        {coverImage.creditNl}
                                    </span>
                                )}
                            </div>
                        )}
                    </header>

                    {/* Content */}
                    <div className="mx-auto max-w-[750px]">
                        <TiptapRenderer content={article.content} mediaMap={mediaMap} />
                    </div>

                    {/* Connected entities — TODO: replace static data with API when backend supports public relations */}
                    <section className="border-foreground/20 mx-auto mt-12 max-w-[750px] border-t pt-8">
                        <h2 className="text-foreground mb-5 font-mono text-[10px] font-medium tracking-[2px] uppercase">
                            {t("connectedTo")}
                        </h2>
                        <div className="grid grid-cols-1 gap-px">
                            {STATIC_CONNECTED_ENTITIES.map((entity) => (
                                <div
                                    key={entity.label}
                                    className="border-muted/35 group hover:bg-muted/5 flex items-center gap-3 border-b p-3 transition-colors"
                                >
                                    <span className="border-foreground text-foreground shrink-0 border px-1.5 py-0.5 font-mono text-[8px] tracking-[1.1px] uppercase">
                                        {entity.type}
                                    </span>
                                    <span className="font-display text-foreground text-[15px] leading-snug font-bold tracking-[-0.01em]">
                                        {entity.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Related articles — TODO: replace static data with API */}
                    <section className="mx-auto mt-10 max-w-[750px] pt-8 pb-4">
                        <div className="mb-5 flex items-center gap-2.5">
                            <h2 className="text-foreground font-mono text-[10px] font-medium tracking-[2px] uppercase">
                                {t("moreStories")}
                            </h2>
                            <span className="bg-muted/40 h-px flex-1" />
                        </div>
                        <div className="grid grid-cols-1 gap-px sm:grid-cols-3">
                            {STATIC_RELATED_ARTICLES.map((related) => (
                                <div
                                    key={related.title}
                                    className="border-muted/35 group hover:bg-muted/5 cursor-pointer border-b p-4 transition-colors sm:border-r sm:last:border-r-0"
                                >
                                    <span className="text-muted-foreground mb-2 block font-mono text-[9px] tracking-[2px] uppercase">
                                        {related.period}
                                    </span>
                                    <h3 className="font-display text-foreground mb-1 text-[18px] leading-[1.15] font-bold tracking-[-0.02em]">
                                        {related.title}
                                    </h3>
                                    <span className="text-muted-foreground font-mono text-[9px] tracking-[1.4px] uppercase">
                                        {related.date}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </article>
            )}
        </>
    );
}
