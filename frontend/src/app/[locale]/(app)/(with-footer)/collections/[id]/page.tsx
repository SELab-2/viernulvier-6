"use client";

import { use, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useGetCollection } from "@/hooks/api/useCollections";
import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";
import { CollectionHeader, CollectionGrid } from "@/components/collections";

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
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

    const { data: collection, isLoading, isError } = useGetCollection(id);

    return (
        <>
            <UnifiedHeader
                query={headerQuery}
                onQueryChange={setHeaderQuery}
                onSearch={handleHeaderSearch}
                searchPlaceholder={tSearch("placeholder")}
                searchHint={tSearch("hint")}
            />

            {isLoading && <LoadingState message={t("loading")} />}

            {isError && (
                <VintageEmptyState title={t("notFoundTitle")} description={t("notFoundText")} />
            )}

            {collection && (
                <article className="mx-auto max-w-[1100px] px-4 py-8 sm:px-10 sm:py-12">
                    <CollectionHeader collection={collection} />
                    <CollectionGrid items={collection.items} />
                </article>
            )}
        </>
    );
}
