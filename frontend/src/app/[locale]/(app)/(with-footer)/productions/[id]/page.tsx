"use client";

import { use, useMemo, useState, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { notFound, useSearchParams } from "next/navigation";

import { ArrowUpRight } from "lucide-react";

import { useGetProduction, useGetProductions } from "@/hooks/api/useProductions";
import { useGetArtistsByProduction } from "@/hooks/api/useArtists";
import { useGetEventsByProduction } from "@/hooks/api/useEvents";
import { useGetArticlesByProduction } from "@/hooks/api/useArticles";
import { useProductionCollections } from "@/hooks/api/useCollections";
import { useHasPreview } from "@/hooks/usePreviewData";
import {
    useProductionWithPreview,
    useProductionEventsWithPreview,
} from "@/hooks/useProductionPreview";
import { useGetEntityMedia } from "@/hooks/api/useMedia";
import { getLocalizedField } from "@/lib/locale";
import { Link, useRouter } from "@/i18n/routing";

import Image from "next/image";

import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { PreviewBadge } from "@/components/preview";

import { ProductionHero } from "@/components/productionpage/production-hero";
import { ProductionArticle } from "@/components/productionpage/production-article";
import { ProductionSidebar } from "@/components/productionpage/production-sidebar";
import { ProductionRelated } from "@/components/productionpage/production-related";
import { ProductionArticles } from "@/components/productionpage/production-articles";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";
import { Production, ProductionRow } from "@/types/models/production.types";

// Helper to get title from Production or ProductionRow
function getProductionTitle(production: Production | ProductionRow, locale: string): string | null {
    // Check if it's ProductionRow (has titleNl/titleEn fields)
    if ("titleNl" in production || "titleEn" in production) {
        const row = production as ProductionRow;
        return locale === "en" ? row.titleEn : row.titleNl;
    }
    // It's Production (has translations array)
    const prod = production as Production;
    if (!prod.translations) return null;
    const translation = prod.translations.find(
        (t) => t.languageCode === (locale === "en" ? "en" : "nl")
    );
    return translation?.title ?? null;
}

export default function ProductionPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id } = use(params);
    const locale = useLocale();
    const tSearch = useTranslations("Search");
    const tProd = useTranslations("ProductionPage");
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

    const { data: apiProduction, isLoading: isProdLoading, isError } = useGetProduction(id);
    const { data: structuredArtists = [] } = useGetArtistsByProduction(id);
    const { data: apiEvents = [], isLoading: isEventsLoading } = useGetEventsByProduction(id);
    const { data: productionsResult, isLoading: isAllProdLoading } = useGetProductions();
    const { data: linkedArticles = [] } = useGetArticlesByProduction(id);
    const { data: media = [] } = useGetEntityMedia("production", id);
    const { data: publicCollections = [] } = useProductionCollections(id, "public");

    // Always call preview hooks (they handle preview mode internally)
    const previewProduction = useProductionWithPreview(id, apiProduction, sessionId);
    const previewEvents = useProductionEventsWithPreview(id, apiEvents, sessionId);
    const hasPreviewData = useHasPreview("production", id, sessionId);

    // In preview mode, use preview data if available, otherwise fall back to API
    const production = isPreviewMode ? (previewProduction ?? apiProduction) : apiProduction;
    const events = isPreviewMode ? (previewEvents ?? apiEvents) : apiEvents;
    const isPreview = isPreviewMode && hasPreviewData;

    const isLoading = isProdLoading || isEventsLoading || isAllProdLoading;

    const relatedProductions = useMemo(() => {
        if (!productionsResult?.data || !production) return [];
        return productionsResult.data
            .filter(
                (p) => p.id !== production.id // && p.uitdatabankType === production.uitdatabankType // Maybe filter here later
            )
            .slice(0, 4);
    }, [productionsResult, production]);

    if (isError && !isPreview) {
        notFound();
    }

    if (isLoading || !production) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    onSearch={handleHeaderSearch}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <LoadingState message={tProd("loading")} />
            </>
        );
    }

    const title = getProductionTitle(production, locale) ?? production.slug;
    const artist = getLocalizedField(production as Production, "artist", locale);

    return (
        <div className="bg-background text-foreground font-body min-h-screen">
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {/* Breadcrumb */}
            <div className="border-muted/25 text-muted-foreground flex items-center gap-2 border-b px-6 py-3 font-mono text-[9px] tracking-[1.4px] uppercase sm:px-10">
                <Link href="/search" className="hover:text-foreground transition-colors">
                    {tProd("breadcrumbArchive")}
                </Link>
                <span className="opacity-50">/</span>
                <Link href="/search" className="hover:text-foreground transition-colors">
                    {tProd("breadcrumbProductions")}
                </Link>
                <span className="opacity-50">/</span>
                <span className="text-foreground max-w-[200px] truncate">{title}</span>
                {isPreview && (
                    <>
                        <span className="opacity-50">/</span>
                        <PreviewBadge entityType="production" entityId={id} sessionId={sessionId} />
                    </>
                )}
            </div>

            {/* Main layout */}
            <div className="border-foreground animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col border-b-2 duration-500 lg:flex-row">
                {/* Hero — mobile only (desktop version lives inside the right column) */}
                <div className="order-1 lg:hidden">
                    <ProductionHero production={production} locale={locale} media={media} />
                </div>

                {/* Left: title + article */}
                <div className="border-border order-2 flex-1 border-b p-6 pb-16 sm:p-10 lg:order-1 lg:border-r lg:border-b-0 lg:pr-[50px]">
                    <div className="mb-2 flex flex-col py-4">
                        <h1
                            className={`font-display text-foreground text-[clamp(32px,4.5vw,58px)] leading-[1.05] font-bold tracking-[-0.03em] ${structuredArtists.length > 0 || artist ? "mb-2" : "mb-8"}`}
                        >
                            {title}
                        </h1>
                        {structuredArtists.length > 0 ? (
                            <p className="font-display text-foreground/40 mb-8 text-[clamp(22px,3vw,38px)] leading-[1.15] font-bold tracking-[-0.03em] italic">
                                {structuredArtists.map((a, i) => (
                                    <span key={a.id}>
                                        {i > 0 &&
                                            (i === structuredArtists.length - 1 ? " & " : ", ")}
                                        <Link
                                            href={`/artists/${a.id}`}
                                            className="hover:decoration-foreground inline-flex items-center gap-1 no-underline underline-offset-4 transition-all hover:underline"
                                        >
                                            {a.name}
                                            <ArrowUpRight
                                                className="h-[0.6em] w-[0.6em] shrink-0"
                                                strokeWidth={1.5}
                                            />
                                        </Link>
                                    </span>
                                ))}
                            </p>
                        ) : artist ? (
                            <p className="font-display text-foreground/40 mb-8 text-[clamp(32px,4.5vw,58px)] leading-[1.05] font-bold tracking-[-0.03em] italic">
                                {artist}
                            </p>
                        ) : null}
                        {(production as Production).tags?.length > 0 && (
                            <EntityTagStrip
                                tags={(production as Production).tags}
                                locale={locale}
                                cap={8}
                                className="mb-4"
                            />
                        )}
                    </div>
                    <ProductionArticle
                        production={production}
                        locale={locale}
                        media={media}
                        artists={structuredArtists}
                    />
                </div>

                {/* Right: image (desktop only) + sidebar */}
                <div className="order-3 flex w-full shrink-0 flex-col lg:order-2 lg:w-[380px] xl:w-[480px]">
                    <div className="hidden lg:block">
                        <ProductionHero production={production} locale={locale} media={media} />
                    </div>
                    <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-6 delay-200 duration-500 sm:p-[30px_24px]">
                        <ProductionSidebar
                            production={production as Production}
                            events={events}
                            locale={locale}
                        />
                    </div>
                </div>
            </div>

            {/* Linked Articles */}
            <ProductionArticles articles={linkedArticles} locale={locale} />

            {/* Part of Collections */}
            {publicCollections.length > 0 && (
                <section className="border-foreground/10 border-t px-6 py-10 sm:px-10">
                    <h2 className="font-display text-foreground mb-6 text-[22px] font-bold tracking-[-0.02em]">
                        {tProd("partOfTitle")}
                    </h2>
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {publicCollections.map((col) => {
                            const translation =
                                col.translations.find((tr) => tr.languageCode === locale) ??
                                col.translations[0];
                            const colTitle = translation?.title ?? col.slug;
                            const colDescription = translation?.description;
                            return (
                                <li key={col.id}>
                                    <Link
                                        href={`/collections/${col.slug}`}
                                        className="border-border/70 hover:bg-foreground/[0.06] group flex gap-4 border p-4 transition-colors"
                                    >
                                        <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden">
                                            {col.coverImageUrl ? (
                                                <Image
                                                    src={col.coverImageUrl}
                                                    alt={colTitle}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="from-muted to-muted/40 h-full w-full bg-gradient-to-br" />
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-col justify-center gap-1">
                                            <span className="font-display text-foreground line-clamp-2 text-sm leading-tight font-semibold">
                                                {colTitle}
                                            </span>
                                            {colDescription && (
                                                <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                                                    {colDescription}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Related Section */}
            {relatedProductions.length > 0 && (
                <ProductionRelated productions={relatedProductions} locale={locale} />
            )}
        </div>
    );
}
