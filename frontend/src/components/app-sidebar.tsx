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
    activeTags: Set<string>;
    onToggle: (slug: string) => void;
    onClear: () => void;
}

function FacetFilters({ facets, activeTags, onToggle, onClear }: FacetFiltersProps) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>

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
                                    checked={activeTags.has(tag.slug)}
                                    onCheckedChange={() => onToggle(tag.slug)}
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

            {activeTags.size > 0 && (
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

    const activeTags = useMemo(() => {
        const raw = searchParams.get("tags");
        return new Set(raw ? raw.split(",").filter(Boolean) : []);
    }, [searchParams]);

    const toggleTag = useCallback(
        (slug: string) => {
            const next = new Set(activeTags);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            const params = new URLSearchParams(searchParams.toString());
            if (next.size > 0) {
                params.set("tags", [...next].join(","));
            } else {
                params.delete("tags");
            }
            router.replace(`${pathname}?${params.toString()}`);
        },
        [activeTags, searchParams, pathname, router]
    );

    const clearFilters = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tags");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, [searchParams, pathname, router]);

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
                                activeTags={activeTags}
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
