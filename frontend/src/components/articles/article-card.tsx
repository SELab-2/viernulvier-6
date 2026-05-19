"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

import type { ArticleListItem } from "@/types/models/article.types";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";

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
    const title = article.title ?? t("untitled");

    return (
        <article
            className="group border-muted/25 hover:bg-muted/5 relative grid w-full cursor-pointer grid-cols-[110px_1fr] items-start gap-5 border-b px-1 py-5 transition-colors duration-200 sm:grid-cols-[160px_1fr] sm:gap-8 sm:py-6"
            style={{ animation: "fadein 0.3s ease both" }}
        >
            <Link
                href={`/articles/${article.slug}`}
                aria-label={title}
                className="absolute inset-0 z-10"
            />

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
                    <ImagePlaceholder id={article.id} className="absolute inset-0" />
                )}
            </div>

            <div className="flex min-w-0 flex-col">
                <h3 className="font-display text-foreground mb-2 min-w-0 text-[20px] leading-[1.15] font-bold tracking-[-0.02em] break-words sm:text-[26px]">
                    {title}
                </h3>

                {article.tags.length > 0 && (
                    <div className="relative z-20 mt-2">
                        <EntityTagStrip tags={article.tags} locale={locale} cap={4} />
                    </div>
                )}

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
    );
}
