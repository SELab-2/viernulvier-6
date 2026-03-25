"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Link, usePathname } from "@/i18n/routing";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import type { Facet, EntityType } from "@/types/models/taxonomy.types";

const ENTITY_TYPES: { slug: string; label: string }[] = [
    { slug: "productions", label: "Productions" },
    { slug: "articles", label: "Articles" },
    { slug: "locations", label: "Locations" },
    { slug: "performers", label: "Performers" },
];

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
    const hasActiveFilters = Object.values(activeFacets).some((s) => s.size > 0);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>

            {facets.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-xs">No filters available.</p>
            )}

            {facets.map((facet) => (
                <div key={facet.slug} className="mb-3">
                    <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                        {facet.label}
                    </p>
                    <ul className="space-y-1">
                        {facet.tags.map((tag) => (
                            <li key={tag.slug} className="flex items-center gap-2 px-2 py-0.5">
                                <Checkbox
                                    id={`tag-${tag.slug}`}
                                    checked={activeFacets[facet.slug]?.has(tag.slug) ?? false}
                                    onCheckedChange={() => onToggle(facet.slug, tag.slug)}
                                />
                                <Label
                                    htmlFor={`tag-${tag.slug}`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {tag.label}
                                </Label>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {hasActiveFilters && (
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={onClear} className="text-muted-foreground">
                            Clear filters
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            )}
        </SidebarGroup>
    );
}

export function AppSidebar() {
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
                    <SidebarGroupLabel>Content type</SidebarGroupLabel>
                    <SidebarMenu>
                        {ENTITY_TYPES.map((type) => (
                            <SidebarMenuItem key={type.slug}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === `/cms/${type.slug}`}
                                >
                                    <Link href={`/cms/${type.slug}`}>{type.label}</Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                {entityType !== null && (
                    <>
                        {isLoading && (
                            <SidebarGroup>
                                <SidebarGroupLabel>Filters</SidebarGroupLabel>
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
