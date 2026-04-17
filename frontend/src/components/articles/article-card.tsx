"use client";

import { Link } from "@/i18n/routing";
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
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function ArticleCard({ article, locale }: ArticleCardProps) {
    const t = useTranslations("Articles");
    const period = formatPeriod(article.subjectPeriodStart, article.subjectPeriodEnd, locale);

    return (
        <Link href={`/articles/${article.slug}`} className="group block w-full">
            <article
                className="border-muted/25 hover:bg-muted/5 grid w-full cursor-pointer grid-cols-[110px_1fr] items-start gap-5 border-b px-1 py-5 transition-colors duration-200 sm:grid-cols-[160px_1fr] sm:gap-8 sm:py-6"
                style={{ animation: "fadein 0.3s ease both" }}
            >
                <div className="bg-muted/15 border-muted/30 relative aspect-[4/3] w-full overflow-hidden border">
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
                </div>

                <div className="flex min-w-0 flex-col">
                    <div className="mb-3 flex items-center gap-3">
                        <span className="bg-foreground h-px w-5" />
                        <span className="text-muted-foreground group-hover:text-foreground font-mono text-[9px] tracking-[2.5px] uppercase transition-colors">
                            {formatDate(article.updatedAt, locale)}
                        </span>
                    </div>

                    <h3 className="font-display text-foreground mb-2 min-w-0 text-[20px] leading-[1.15] font-bold tracking-[-0.02em] break-words sm:text-[26px]">
                        {article.title ?? t("untitled")}
                    </h3>

                    {period && (
                        <span className="text-muted-foreground font-display mt-1 text-[13px] italic sm:text-[14px]">
                            {period}
                        </span>
                    )}
                </div>
            </article>
        </Link>
    );
}
