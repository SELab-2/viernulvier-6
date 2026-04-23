"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";

import { useGetCollectionBySlug } from "@/hooks/api/useCollections";
import { useHasPreview } from "@/hooks/usePreviewData";
import { useCollectionWithPreview } from "@/hooks/useCollectionPreview";
import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";
import { PreviewBadge } from "@/components/preview";
import { CollectionHeader, CollectionGrid } from "@/components/collections";

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const locale = useLocale();
    const t = useTranslations("Collections");
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

    useEffect(() => {
        if (isPreviewMode && sessionId) {
            localStorage.setItem(`cms_preview_locale:${sessionId}`, locale);
        }
    }, [isPreviewMode, locale, sessionId]);

    const { data: apiCollection, isLoading, isError } = useGetCollectionBySlug(slug);

    const previewCollection = useCollectionWithPreview(slug, apiCollection, sessionId);
    const hasPreviewData = useHasPreview("collection", slug, sessionId);

    const collection = isPreviewMode ? (previewCollection ?? apiCollection) : apiCollection;
    const isPreview = isPreviewMode && hasPreviewData;

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

            {collection && (
                <article className="mx-auto max-w-[1100px] px-4 py-8 sm:px-10 sm:py-12">
                    <CollectionHeader
                        collection={collection}
                        previewNode={
                            isPreview ? (
                                <PreviewBadge
                                    entityType="collection"
                                    entityId={slug}
                                    sessionId={sessionId}
                                />
                            ) : null
                        }
                    />
                    <CollectionGrid items={collection.items} />
                </article>
            )}
        </>
    );
}
