"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { ArticleListItem } from "@/types/models/article.types";

interface ArticleCardProps {
    article: ArticleListItem;
    locale: string;
}

function formatPeriod(start: string | null, end: string | null, locale: string): string | null {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };

    if (start && end) {
        return `${new Date(start).toLocaleDateString(loc, opts)} — ${new Date(end).toLocaleDateString(loc, opts)}`;
    }
    if (start) {
        return new Date(start).toLocaleDateString(loc, opts);
    }
    return null;
}

function formatDate(dateStr: string, locale: string): string {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function ArticleCard({ article, locale }: ArticleCardProps) {
    const t = useTranslations("Articles");
    const period = formatPeriod(article.subjectPeriodStart, article.subjectPeriodEnd, locale);

    return (
        <Link href={`/articles/${article.slug}`}>
            <article
                className="group border-muted/35 hover:bg-muted/5 flex cursor-pointer flex-col border-b p-4 transition-colors sm:p-5"
                style={{ animation: "fadein 0.3s ease both" }}
            >
                {period && (
                    <span className="text-muted-foreground group-hover:text-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase transition-colors">
                        {period}
                    </span>
                )}

                <h3 className="font-display text-foreground mb-1 text-[20px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[24px]">
                    {article.title ?? t("untitled")}
                </h3>

                <span className="text-muted-foreground mt-auto pt-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                    {formatDate(article.updatedAt, locale)}
                </span>
            </article>
        </Link>
    );
}
