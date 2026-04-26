"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import type { ArticleListItem } from "@/types/models/article.types";

function formatPublishDate(dateStr: string, locale: string): string {
    return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "nl-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function ArticleCard({ article, locale }: { article: ArticleListItem; locale: string }) {
    const t = useTranslations("ProductionPage");

    return (
        <Link
            href={`/articles/${article.slug}`}
            className="bg-background hover:bg-muted/5 group block cursor-pointer p-4 transition-colors"
        >
            <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden bg-[#ccc6bc]">
                {article.coverImageUrl ? (
                    <Image
                        src={article.coverImageUrl}
                        alt={article.title ?? ""}
                        fill
                        className="object-cover grayscale-[15%] transition-all duration-300 group-hover:grayscale-0"
                        sizes="(max-width: 640px) 100vw, 50vw"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4] grayscale-[15%] transition-all duration-300 group-hover:grayscale-0" />
                )}
            </div>
            {article.publishedAt && (
                <div className="text-muted-foreground mb-1.5 font-mono text-[8px] tracking-[1.4px] uppercase">
                    {formatPublishDate(article.publishedAt, locale)} · {t("articlesLabel")}
                </div>
            )}
            <div className="font-display text-foreground line-clamp-2 text-[16px] leading-[1.2] font-bold tracking-[-0.02em]">
                {article.title ?? t("articlesFallbackTitle")}
            </div>
        </Link>
    );
}

export function ProductionArticles({
    articles,
    locale,
}: {
    articles: ArticleListItem[];
    locale: string;
}) {
    const t = useTranslations("ProductionPage");

    if (articles.length === 0) return null;

    return (
        <div className="border-foreground bg-background border-t-2 px-6 py-10 sm:px-10 sm:py-12">
            <div className="mb-6">
                <h2 className="font-display text-foreground text-[22px] font-bold tracking-[-0.02em]">
                    {t("articlesTitle")}
                </h2>
            </div>
            <div className="bg-muted/30 border-muted/30 grid grid-cols-1 gap-[1px] border sm:grid-cols-2">
                {articles.map((a) => (
                    <ArticleCard key={a.id} article={a} locale={locale} />
                ))}
            </div>
        </div>
    );
}
