"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import type { ArticleListItem } from "@/types/models/article.types";
import { LoadingState } from "@/components/shared/loading-state";

interface ArticleItemProps {
    article: ArticleListItem;
    locale: string;
}

function formatDate(dateStr: string | null, locale: string): string | null {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "nl-BE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function ArticleItem({ article, locale }: ArticleItemProps) {
    const t = useTranslations("Articles");
    const tSidebar = useTranslations("Sidebar");
    const publishedAt = formatDate(article.publishedAt ?? null, locale);

    return (
        <Link
            href={`/articles/${article.slug}`}
            className="border-muted/35 hover:bg-muted/5 flex cursor-pointer items-start gap-3 border-b px-4 py-3.5 transition-all sm:gap-[18px] sm:px-7"
            style={{ animation: "fadein 0.3s ease both" }}
        >
            <div className="bg-muted relative h-[108px] w-[144px] shrink-0 overflow-hidden sm:h-[136px] sm:w-[180px]">
                {article.coverImageUrl ? (
                    <Image
                        src={article.coverImageUrl}
                        alt={article.title ?? t("untitled")}
                        fill
                        className="object-cover"
                        sizes="180px"
                    />
                ) : (
                    <>
                        <div
                            className="absolute inset-0 opacity-[0.08]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 8px)",
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-muted-foreground/50 font-mono text-[9px] tracking-[2px] uppercase">
                                N°{article.id.slice(-3)}
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <span className="font-display text-foreground block text-[19px] leading-[1.1] font-bold tracking-[-0.02em] sm:text-[22px]">
                    {article.title ?? t("untitled")}
                </span>
                {publishedAt && (
                    <span className="text-muted-foreground mt-1 block font-mono text-[11px] tracking-[0.08em]">
                        {publishedAt}
                    </span>
                )}
            </div>

            <span className="border-foreground text-foreground shrink-0 border px-2 py-1 font-mono text-[8px] font-medium tracking-[1.3px] uppercase">
                {tSidebar("categories.articles")}
            </span>
        </Link>
    );
}

interface ArticleListProps {
    articles: ArticleListItem[];
    locale: string;
    isLoading?: boolean;
}

export function ArticleList({ articles, locale, isLoading }: ArticleListProps) {
    const t = useTranslations("Home");

    return (
        <div
            className={`relative overflow-hidden ${
                isLoading && articles.length === 0 ? "flex-1" : ""
            }`}
        >
            {isLoading && articles.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <LoadingState message={t("loading")} className="min-h-0" />
                </div>
            )}
            {articles.map((article) => (
                <ArticleItem key={article.id} article={article} locale={locale} />
            ))}
        </div>
    );
}
