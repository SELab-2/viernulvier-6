"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";
import { Clapperboard, MapPin, Newspaper, Users, Database, FileUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { getLabel } from "@/lib/utils";
import type { EntityType, Facet } from "@/types/models/taxonomy.types";

const navItems = [
    { key: "productions", href: "/cms/productions", icon: Clapperboard, editionKey: "edition1" },
    { key: "locations", href: "/cms/locations", icon: MapPin, editionKey: "edition2" },
    { key: "articles", href: "/cms/articles", icon: Newspaper, editionKey: "edition3" },
    { key: "performers", href: "/cms/performers", icon: Users, editionKey: "edition4" },
];

const utilityItems = [
    { key: "ingest", href: "/cms/ingest", icon: Database, editionKey: "edition5" },
    { key: "import", href: "/cms/import", icon: FileUp, editionKey: "edition6" },
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
    const t = useTranslations("Cms.Sidebar");
    const locale = useLocale();
    const hasActiveFilters = Object.values(activeFacets).some((s) => s.size > 0);

    return (
        <div className="px-3">
            <div className="text-muted-foreground mb-3 text-center font-mono text-xs tracking-[2px] uppercase">
                — {t("filters")} —
            </div>

            {facets.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-xs">{t("noFilters")}</p>
            )}

            {facets.map((facet) => (
                <div key={facet.slug} className="border-foreground/10 mb-4 border p-2.5">
                    <p className="text-foreground font-display mb-2 text-xs font-bold tracking-tight">
                        {getLabel(facet.translations, locale)}
                    </p>
                    <ul className="space-y-1.5">
                        {facet.tags.map((tag) => (
                            <li key={tag.slug} className="flex items-center gap-2">
                                <Checkbox
                                    id={`tag-${tag.slug}`}
                                    checked={activeFacets[facet.slug]?.has(tag.slug) ?? false}
                                    onCheckedChange={() => onToggle(facet.slug, tag.slug)}
                                    className="border-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                                />
                                <Label
                                    htmlFor={`tag-${tag.slug}`}
                                    className="font-body cursor-pointer text-xs font-normal"
                                >
                                    {getLabel(tag.translations, locale)}
                                </Label>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {hasActiveFilters && (
                <button
                    onClick={onClear}
                    className="text-muted-foreground hover:text-foreground w-full font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                >
                    {t("clearFilters")}
                </button>
            )}
        </div>
    );
}

// Sidebar content component (shared between desktop and mobile)
interface SidebarContentProps {
    onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
    const t = useTranslations("Cms");
    const tSidebar = useTranslations("Cms.sidebar");
    const tEditions = useTranslations("Cms.editions");
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const entityType = ENTITY_TYPE_MAP[pathname] ?? null;
    const { data: facets } = useGetFacets({ entityType: entityType ?? undefined });

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

    const isActive = (href: string) => {
        return pathname.startsWith(href);
    };

    const handleNavClick = () => {
        onNavigate?.();
    };

    return (
        <>
            {/* Header - Newspaper style */}
            <div className="px-5 pt-5 pb-3">
                <Link href="/cms" className="block text-center" onClick={handleNavClick}>
                    <div className="font-display text-foreground text-[28px] leading-tight font-black tracking-tight uppercase">
                        CMS
                    </div>
                    <div className="bg-foreground mx-auto mt-2 h-0.5 w-16" />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-5">
                {/* Main Content Section */}
                <div className="mb-5">
                    <div className="text-muted-foreground mb-3 px-5 text-center font-mono text-xs tracking-[2px] uppercase">
                        — {tSidebar("content")} —
                    </div>

                    <div className="space-y-2 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={handleNavClick}
                                    className={`group relative flex flex-col border p-2.5 transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5"
                                            : "border-foreground/10 hover:border-foreground/30"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="text-muted-foreground font-mono text-[8px] tracking-[1px] uppercase">
                                            {tEditions(item.editionKey)}
                                        </div>
                                        <Icon
                                            className={`h-3.5 w-3.5 transition-colors ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-muted-foreground/40 group-hover:text-foreground"
                                            }`}
                                        />
                                    </div>
                                    <div className="mt-1.5">
                                        <span
                                            className={`font-display text-sm font-bold tracking-tight ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-foreground/70 group-hover:text-foreground"
                                            }`}
                                        >
                                            {t(item.key)}
                                        </span>
                                    </div>
                                    {active && <div className="bg-foreground mt-1.5 h-0.5 w-8" />}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Utility Section */}
                <div className="mb-5">
                    <div className="text-muted-foreground mb-3 px-5 text-center font-mono text-xs tracking-[2px] uppercase">
                        — {tSidebar("system")} —
                    </div>

                    <div className="space-y-2 px-3">
                        {utilityItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={handleNavClick}
                                    className={`group relative flex items-center gap-3 border p-2.5 transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5"
                                            : "border-foreground/10 hover:border-foreground/30"
                                    }`}
                                >
                                    <Icon
                                        className={`h-3.5 w-3.5 transition-colors ${
                                            active
                                                ? "text-foreground"
                                                : "text-muted-foreground/40 group-hover:text-foreground"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <span
                                            className={`font-display text-sm font-bold tracking-tight ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-foreground/70 group-hover:text-foreground"
                                            }`}
                                        >
                                            {t(item.key)}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground font-mono text-[8px] tracking-[1px]">
                                        {tEditions(item.editionKey)}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Filters Section */}
                {entityType !== null && facets && facets.length > 0 && (
                    <div className="mb-5">
                        <FacetFilters
                            facets={facets}
                            activeFacets={activeFacets}
                            onToggle={toggleTag}
                            onClear={clearFilters}
                        />
                    </div>
                )}
            </nav>
        </>
    );
}

export function CmsSidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar - Always visible */}
            <aside className="border-foreground/20 bg-background hidden h-full w-56 flex-col border-r lg:flex">
                <SidebarContent />
            </aside>

            {/* Mobile Header with Menu Button */}
            <div className="border-foreground/20 bg-background flex items-center justify-between border-b p-4 lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground hover:border-foreground/40 border-foreground/20 flex items-center gap-2 border px-3 py-2 font-mono text-[10px] tracking-[1.5px] uppercase transition-colors"
                            aria-label="Open menu"
                        >
                            <span>Menu</span>
                            <span className="text-[8px]">→</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <div className="flex h-full flex-col">
                            <div className="border-foreground/20 flex items-center justify-between border-b p-4">
                                <span className="font-display text-lg font-black tracking-tight uppercase">
                                    Menu
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto py-4">
                                <SidebarContent onNavigate={() => setMobileOpen(false)} />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
