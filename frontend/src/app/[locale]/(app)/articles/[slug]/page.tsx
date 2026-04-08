"use client";

import { use, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useGetArticleBySlug } from "@/hooks/api/useArticles";
import { Link } from "@/i18n/routing";

import { SearchHeader } from "@/components/homepage/search-header";
import { TiptapRenderer, ArticleRelations } from "@/components/articles";
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

function formatPeriod(start: string | null, end: string | null, locale: string): string | null {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

    if (start && end) {
        return `${new Date(start).toLocaleDateString(loc, opts)} — ${new Date(end).toLocaleDateString(loc, opts)}`;
    }
    if (start) {
        return new Date(start).toLocaleDateString(loc, opts);
    }
    return null;
}

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
                <article className="mx-auto max-w-[900px] px-4 py-8 sm:px-10 sm:py-12">
                    {/* Back link */}
                    <Link
                        href="/articles"
                        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        {t("backToArticles")}
                    </Link>

                    {/* Article header */}
                    <header className="border-foreground mb-8 border-b-[3px] pb-6">
                        {/* Subject period */}
                        {(article.subjectPeriodStart || article.subjectPeriodEnd) && (
                            <span className="text-muted-foreground mb-3 block font-mono text-[9px] tracking-[2px] uppercase">
                                {formatPeriod(
                                    article.subjectPeriodStart,
                                    article.subjectPeriodEnd,
                                    locale
                                )}
                            </span>
                        )}

                        <h1 className="font-display text-foreground text-[32px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[44px] md:text-[56px]">
                            {article.title ?? t("untitled")}
                        </h1>

                        {/* Dateline bar */}
                        <div className="border-foreground text-foreground mt-6 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                            <span>{formatDate(article.createdAt, locale)}</span>
                            <span>{t("datelineBrand")}</span>
                            <span>{formatDate(article.updatedAt, locale)}</span>
                        </div>
                    </header>

                    {/* Content + sidebar */}
                    <div className="flex flex-col gap-8 sm:flex-row">
                        {/* Main content */}
                        <div className="min-w-0 flex-1">
                            <TiptapRenderer content={article.content} />
                        </div>

                        {/* Relations sidebar — visually ready, pass data when API available */}
                        <div className="w-full shrink-0 sm:w-[240px]">
                            <ArticleRelations />
                        </div>
                    </div>
                </article>
            )}
        </>
    );
}
