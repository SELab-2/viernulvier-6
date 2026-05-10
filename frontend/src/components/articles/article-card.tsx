"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import type { ArticleListItem } from "@/types/models/article.types";

interface ArticleCardProps {
    article: ArticleListItem;
    locale: string;
}

function formatDate(dateStr: string | null, locale: string): string | null {
    if (!dateStr) return null;
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatPeriodDate(dateStr: string | null, locale: string): string | null {
    if (!dateStr) return null;
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        month: "short",
        year: "numeric",
    });
}

export function ArticleCard({ article, locale }: ArticleCardProps) {
    const t = useTranslations("Articles");
    const publishedAt = formatDate(article.publishedAt ?? null, locale);
    const periodStart = formatPeriodDate(article.subjectPeriodStart ?? null, locale);
    const periodEnd = formatPeriodDate(article.subjectPeriodEnd ?? null, locale);

    const coverUrl = article.coverImageUrl;

    return (
        <Link href={`/articles/${article.slug}`} className="group block w-full">
            <article
                className="border-muted/25 hover:bg-muted/5 grid w-full cursor-pointer grid-cols-[110px_1fr] items-start gap-5 border-b px-1 py-5 transition-colors duration-200 sm:grid-cols-[160px_1fr] sm:gap-8 sm:py-6"
                style={{ animation: "fadein 0.3s ease both" }}
            >
                <div className="bg-muted/15 border-muted/30 relative aspect-[4/3] w-full overflow-hidden border">
                    {coverUrl ? (
                        <Image
                            src={coverUrl}
                            alt={article.title ?? ""}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 110px, 160px"
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

                <div className="flex min-w-0 flex-col">
                    <h3 className="font-display text-foreground mb-2 min-w-0 text-[20px] leading-[1.15] font-bold tracking-[-0.02em] break-words sm:text-[26px]">
                        {article.title ?? t("untitled")}
                    </h3>

                    {periodStart && periodEnd && (
                        <span className="text-muted-foreground mt-1 font-mono text-[11px] tracking-[1px]">
                            {periodStart} — {periodEnd}
                        </span>
                    )}

                    {publishedAt && (
                        <span className="text-muted-foreground mt-1 font-mono text-[11px] tracking-[1px]">
                            {publishedAt}
                        </span>
                    )}
                </div>
            </article>
        </Link>
    );
}
