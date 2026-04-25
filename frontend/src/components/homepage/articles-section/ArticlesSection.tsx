"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import type { ArticleListItem } from "@/types/models/article.types";

interface ArticlesSectionProps {
    articles: ArticleListItem[];
}

export function ArticlesSection({ articles }: ArticlesSectionProps) {
    const t = useTranslations("Home");
    const locale = useLocale();

    const items = articles.slice(0, 3);

    return (
        <div>
            <div className="text-muted-foreground mb-3 flex items-center gap-2.5 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                {t("articles.label")}
                <span className="bg-muted/40 h-px flex-1" />
                <Link href="/articles" className="hover:text-foreground transition-colors">
                    {t("articles.viewAll")} →
                </Link>
            </div>

            <div className="bg-muted -mx-4 grid grid-cols-1 gap-px sm:-mx-[30px] sm:grid-cols-3">
                {items.map((article) => (
                    <ArticleCard key={article.id} article={article} locale={locale} />
                ))}
            </div>
        </div>
    );
}

function formatDate(dateStr: string | null, locale: string): string | null {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "nl-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function ArticleCard({ article, locale }: { article: ArticleListItem; locale: string }) {
    const date = formatDate(article.publishedAt, locale);

    return (
        <Link
            href={`/articles/${article.slug}`}
            className="group bg-background hover:bg-muted/5 block p-4 pb-5 transition-colors sm:p-5"
        >
            <div className="relative mb-3 h-[120px] w-full overflow-hidden bg-[#CCC6BC]">
                {article.coverImageUrl ? (
                    <Image
                        src={article.coverImageUrl}
                        alt={article.title ?? ""}
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 33vw, 100vw"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>

            {date && (
                <div className="text-muted-foreground group-hover:text-foreground mb-1.5 font-mono text-[9px] tracking-[1.4px] uppercase transition-colors">
                    {date}
                </div>
            )}

            <div className="font-display text-foreground text-[18px] leading-[1.2] font-bold tracking-[-0.02em] sm:text-[20px]">
                {article.title ?? "–"}
            </div>
        </Link>
    );
}
