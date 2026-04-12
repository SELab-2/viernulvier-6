"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { getLabel } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, usePathname } from "@/i18n/routing";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import type { Facet, EntityType } from "@/types/models/taxonomy.types";

const ENTITY_TYPE_SLUGS = ["productions", "articles", "locations", "performers"] as const;
type EntityTypeSlug = (typeof ENTITY_TYPE_SLUGS)[number];

const ENTITY_TYPE_MAP: Record<string, EntityType | null> = {
    "/cms/productions": "production",
    "/cms/articles": "article",
    "/cms/performers": "artist",
    "/cms/locations": null,
};

interface FacetFiltersProps {
    facets: Facet[];
    activeFacets: Record<string, Set<string>>;
    onToggle: (facetSlug: string, tagSlug: string) => void;
    onClear: () => void;
}

function FacetFilters({ facets, activeFacets, onToggle, onClear }: FacetFiltersProps) {
    const t = useTranslations("Cms.Sidebar");
    const locale = useLocale();
    const hasActiveFilters = Object.values(activeFacets).some((s) => s.size > 0);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{t("filters")}</SidebarGroupLabel>

            {facets.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-xs">{t("noFilters")}</p>
            )}

            {facets.map((facet) => (
                <div key={facet.slug} className="mb-3">
                    <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                        {getLabel(facet.translations, locale)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 px-2">
                        {facet.tags.map((tag) => {
                            const active = activeFacets[facet.slug]?.has(tag.slug) ?? false;
                            return (
                                <button
                                    key={tag.slug}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onToggle(facet.slug, tag.slug)}
                                    className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                        active
                                            ? "bg-foreground text-background border-foreground"
                                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                    }`}
                                >
                                    {getLabel(tag.translations, locale)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {hasActiveFilters && (
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={onClear} className="text-muted-foreground">
                            {t("clearFilters")}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            )}
        </SidebarGroup>
    );
}

export function AppSidebar() {
    const t = useTranslations("Cms.Sidebar");
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const entityType = ENTITY_TYPE_MAP[pathname] ?? null;
    const { data: facets, isLoading } = useGetFacets({ entityType: entityType ?? undefined });

    const activeFacets = useMemo(() => {
        const result: Record<string, Set<string>> = {};
        for (const facet of facets ?? []) {
            const raw = searchParams.get(facet.slug);
            if (raw) result[facet.slug] = new Set(raw.split(",").filter(Boolean));
        }
        return result;
    }, [searchParams, facets]);

    const toggleTag = useCallback(
        (facetSlug: string, tagSlug: string) => {
            // window.location instead of searchParams: router.replace updates the URL synchronously
            // but React re-renders on the next tick, so rapid toggles would overwrite each other.
            const params = new URLSearchParams(window.location.search);
            const raw = params.get(facetSlug);
            const next = new Set(raw ? raw.split(",").filter(Boolean) : []);
            if (next.has(tagSlug)) {
                next.delete(tagSlug);
            } else {
                next.add(tagSlug);
            }
            if (next.size > 0) {
                params.set(facetSlug, [...next].join(","));
            } else {
                params.delete(facetSlug);
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [pathname, router]
    );

    const clearFilters = useCallback(() => {
        const params = new URLSearchParams(window.location.search);
        for (const facet of facets ?? []) params.delete(facet.slug);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, [facets, pathname, router]);

    return (
        <Sidebar>
            <SidebarHeader />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t("contentType")}</SidebarGroupLabel>
                    <SidebarMenu>
                        {ENTITY_TYPE_SLUGS.map((slug) => (
                            <SidebarMenuItem key={slug}>
                                <SidebarMenuButton asChild isActive={pathname === `/cms/${slug}`}>
                                    <Link href={`/cms/${slug}`}>{t(slug as EntityTypeSlug)}</Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                {entityType !== null && (
                    <>
                        {isLoading && (
                            <SidebarGroup>
                                <SidebarGroupLabel>{t("filters")}</SidebarGroupLabel>
                                <div className="space-y-3 px-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </SidebarGroup>
                        )}
                        {facets && (
                            <FacetFilters
                                facets={facets}
                                activeFacets={activeFacets}
                                onToggle={toggleTag}
                                onClear={clearFilters}
                            />
                        )}
                    </>
                )}
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    );
}
