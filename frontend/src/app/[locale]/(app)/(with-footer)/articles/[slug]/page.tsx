"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users, Ticket } from "lucide-react";

import { useGetArticleBySlug } from "@/hooks/api/useArticles";
import { useHasPreview } from "@/hooks/usePreviewData";
import { useArticleWithPreview, useArticleRelationsWithPreview } from "@/hooks/useArticlePreview";
import { Link } from "@/i18n/routing";

import { UnifiedHeader } from "@/components/layout/header";
import { TiptapRenderer } from "@/components/articles";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";
import { PreviewBadge } from "@/components/preview";

function formatDate(dateStr: string, locale: string): string {
    const loc = locale === "en" ? "en-GB" : "nl-BE";
    return new Date(dateStr).toLocaleDateString(loc, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// Static related articles - TODO: replace with API
const STATIC_RELATED_ARTICLES = [
    { title: "De Balzaal door de jaren heen", period: "1960 — 1980", date: "12 mrt 2026" },
    { title: "Achter de schermen van Fresh Juice", period: "Voorjaar 2026", date: "28 feb 2026" },
    { title: "40 jaar Nightlife in De Vooruit", period: "1983 — 2023", date: "15 jan 2026" },
];

interface ConnectedEntityProps {
    type: "production" | "artist" | "location" | "event";
    label: string;
    count?: number;
}

function ConnectedEntity({ type, label, count }: ConnectedEntityProps) {
    const icons = {
        production: Ticket,
        artist: Users,
        location: MapPin,
        event: Calendar,
    };
    const Icon = icons[type];

    return (
        <div className="border-muted/35 group hover:bg-muted/5 flex items-center gap-3 border-b p-3 transition-colors">
            <span className="border-foreground text-foreground flex shrink-0 items-center gap-1 border px-1.5 py-0.5 font-mono text-[8px] tracking-[1.1px] uppercase">
                <Icon className="h-3 w-3" />
                {type}
            </span>
            <span className="font-display text-foreground text-[15px] leading-snug font-bold tracking-[-0.01em]">
                {label}
                {count && count > 1 ? ` (${count})` : ""}
            </span>
        </div>
    );
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

    const searchParams = useSearchParams();
    const isPreviewMode = searchParams.get("preview") === "1";
    const sessionId = searchParams.get("session") ?? undefined;

    // Sync preview locale to localStorage so the editor can stay in sync
    useEffect(() => {
        if (isPreviewMode && sessionId) {
            localStorage.setItem(`cms_preview_locale:${sessionId}`, locale);
        }
    }, [isPreviewMode, locale, sessionId]);

    const { data: apiArticle, isLoading, isError } = useGetArticleBySlug(slug);

    // Always call preview hooks (they handle preview mode internally)
    const previewArticle = useArticleWithPreview(slug, apiArticle, sessionId);
    const previewRelations = useArticleRelationsWithPreview(slug, sessionId);
    const hasPreviewData = useHasPreview("article", slug, sessionId);

    // In preview mode, use preview data if available, otherwise fall back to API
    const article = isPreviewMode ? (previewArticle ?? apiArticle) : apiArticle;
    const isPreview = isPreviewMode && hasPreviewData;

    // Show preview relations if in preview mode, otherwise empty (until API is ready)
    const hasConnections =
        previewRelations &&
        (previewRelations.productionIds.length > 0 ||
            previewRelations.artistIds.length > 0 ||
            previewRelations.locationIds.length > 0 ||
            previewRelations.eventIds.length > 0);

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {isLoading && !isPreview && <LoadingState message={t("loading")} />}

            {isError && !isPreview && (
                <VintageEmptyState title={t("notFoundTitle")} description={t("notFoundText")} />
            )}

            {(article || isPreview) && (
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
                            {article?.title ?? t("untitled")}
                        </h1>

                        {/* Dateline bar */}
                        <div className="border-foreground text-foreground mt-6 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                            <div className="flex items-center gap-3">
                                <span>
                                    {article &&
                                        formatDate(
                                            article.publishedAt ?? article.createdAt,
                                            locale
                                        )}
                                </span>
                                {article?.subjectPeriodStart && (
                                    <span className="text-muted-foreground">
                                        {article.subjectPeriodStart}
                                        {article.subjectPeriodEnd
                                            ? ` — ${article.subjectPeriodEnd}`
                                            : ""}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <PreviewBadge
                                    entityType="article"
                                    entityId={slug}
                                    sessionId={sessionId}
                                />
                                <span>{t("datelineBrand")}</span>
                            </div>
                        </div>
                    </header>

                    {/* Content */}
                    <div className="mx-auto max-w-[750px]">
                        {article?.content && <TiptapRenderer content={article.content} />}
                    </div>

                    {/* Connected entities */}
                    <section className="border-foreground/20 mx-auto mt-12 max-w-[750px] border-t pt-8">
                        <h2 className="text-foreground mb-5 font-mono text-[10px] font-medium tracking-[2px] uppercase">
                            {t("connectedTo")}
                        </h2>
                        <div className="grid grid-cols-1 gap-px">
                            {isPreview && hasConnections ? (
                                // Show preview relations
                                <>
                                    {previewRelations.productionIds.length > 0 && (
                                        <ConnectedEntity
                                            type="production"
                                            label={`${previewRelations.productionIds.length} production${previewRelations.productionIds.length > 1 ? "s" : ""}`}
                                        />
                                    )}
                                    {previewRelations.artistIds.length > 0 && (
                                        <ConnectedEntity
                                            type="artist"
                                            label={`${previewRelations.artistIds.length} artist${previewRelations.artistIds.length > 1 ? "s" : ""}`}
                                        />
                                    )}
                                    {previewRelations.locationIds.length > 0 && (
                                        <ConnectedEntity
                                            type="location"
                                            label={`${previewRelations.locationIds.length} location${previewRelations.locationIds.length > 1 ? "s" : ""}`}
                                        />
                                    )}
                                    {previewRelations.eventIds.length > 0 && (
                                        <ConnectedEntity
                                            type="event"
                                            label={`${previewRelations.eventIds.length} event${previewRelations.eventIds.length > 1 ? "s" : ""}`}
                                        />
                                    )}
                                </>
                            ) : isPreview && !hasConnections ? (
                                <p className="text-muted-foreground py-4 font-mono text-[10px] tracking-wide">
                                    {t("noConnections")}
                                </p>
                            ) : (
                                // Show placeholder for non-preview
                                <p className="text-muted-foreground py-4 font-mono text-[10px] tracking-wide">
                                    {t("connectionsComingSoon")}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Related articles */}
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
