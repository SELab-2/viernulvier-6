"use client";

import { use, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";

import { useGetArtist, useGetProductionsByArtist } from "@/hooks/api/useArtists";
import { Link, useRouter } from "@/i18n/routing";

import { UnifiedHeader } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { EntityGrid } from "@/components/masonry/entity-grid";
import { ArtistHero } from "@/components/artistpage/artist-hero";
import type { EntityGridItem } from "@/types/models/collection.types";

export default function ArtistPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id } = use(params);
    const tSearch = useTranslations("Search");
    const t = useTranslations("ArtistPage");
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

    const { data: artist, isLoading, isError } = useGetArtist(id);
    const { data: productions = [], isLoading: isProductionsLoading } =
        useGetProductionsByArtist(id);

    const gridItems = useMemo<EntityGridItem[]>(
        () =>
            productions.map((p, index) => ({
                id: p.id,
                contentType: "production" as const,
                contentId: p.id,
                position: index,
            })),
        [productions]
    );

    if (isError) notFound();

    if (isLoading || !artist) {
        return (
            <>
                <UnifiedHeader
                    query={headerQuery}
                    onQueryChange={setHeaderQuery}
                    onSearch={handleHeaderSearch}
                    searchPlaceholder={tSearch("placeholder")}
                    searchHint={tSearch("hint")}
                />
                <LoadingState message={t("loading")} />
            </>
        );
    }

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
                    {t("breadcrumbArchive")}
                </Link>
                <span className="opacity-50">/</span>
                <Link href="/artists" className="hover:text-foreground transition-colors">
                    {t("breadcrumbArtists")}
                </Link>
                <span className="opacity-50">/</span>
                <span className="text-foreground max-w-[200px] truncate">{artist.name}</span>
            </div>

            {/* Hero */}
            <ArtistHero artist={artist} />

            {/* Productions */}
            <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-6 delay-150 duration-500 sm:p-10">
                {!isProductionsLoading && gridItems.length > 0 ? (
                    <EntityGrid items={gridItems} />
                ) : (
                    <div className="border-muted/30 text-muted-foreground flex min-h-[320px] items-center justify-center border border-dashed font-mono text-[10px] tracking-[1.2px] uppercase">
                        {t("contentPlaceholder")}
                    </div>
                )}
            </div>
        </div>
    );
}
