"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

import type { Facet } from "@/types/models/taxonomy.types";
import { getLabel } from "@/lib/utils";
import { useGetStats } from "@/hooks/api/useStats";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetFacets } from "@/hooks/api/useTaxonomy";
import { useRouter, usePathname } from "@/i18n/routing";

import { YearRangeSlider } from "./YearRangeSlider";
import { DateRangePicker } from "./DateRangePicker";
import { yearBoundsFromStats } from "./statsYearBounds";

const CATEGORIES = ["artists", "productions", "articles", "posters"] as const;

type DateFilterMode = "year" | "exact";

interface ArchiveSidebarProps {
    minYear?: number;
}

export function ArchiveSidebar({ minYear: minYearProp }: ArchiveSidebarProps) {
    const t = useTranslations("Sidebar");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { data: stats } = useGetStats();
    const { data: locationsResult } = useGetLocations();
    const { data: facets } = useGetFacets({ entityType: "production" });

    const locations = useMemo(() => locationsResult?.data ?? [], [locationsResult?.data]);
    const facetList = useMemo<Facet[]>(() => facets ?? [], [facets]);

    const bounds = useMemo(
        () => yearBoundsFromStats(stats, { minYear: minYearProp }),
        [stats, minYearProp]
    );

    const minDate = useMemo(() => new Date(bounds.minYear, 0, 1), [bounds.minYear]);
    const maxDate = useMemo(() => new Date(bounds.maxYear, 11, 31), [bounds.maxYear]);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [checkedCategories, setCheckedCategories] = useState<Set<string>>(
        new Set(["productions"])
    );

    // Local draft for the year slider — written to URL with debounce.
    // Reset when the URL date params change (e.g. clearAll, back/forward nav).
    const [yearRangeDraft, setYearRangeDraft] = useState<[number, number] | null>(null);
    const dateParamKey = `${searchParams.get("date_from")}|${searchParams.get("date_to")}`;
    const [prevDateParamKey, setPrevDateParamKey] = useState(dateParamKey);
    if (dateParamKey !== prevDateParamKey) {
        setPrevDateParamKey(dateParamKey);
        setYearRangeDraft(null);
    }

    const dateMode: DateFilterMode = searchParams.get("date_mode") === "exact" ? "exact" : "year";

    // Active facet tags from URL: { facetSlug -> Set<tagSlug> }
    const activeFacets = useMemo(() => {
        const result: Record<string, Set<string>> = {};
        for (const facet of facetList) {
            const raw = searchParams.get(facet.slug);
            if (raw) result[facet.slug] = new Set(raw.split(",").filter(Boolean));
        }
        return result;
    }, [searchParams, facetList]);

    // Compute yearRange from URL or fall back to full bounds
    const yearRange = useMemo((): [number, number] => {
        const dateFrom = searchParams.get("date_from");
        const dateTo = searchParams.get("date_to");
        if (dateFrom && dateTo && dateMode === "year") {
            const from = parseInt(dateFrom.slice(0, 4), 10);
            const to = parseInt(dateTo.slice(0, 4), 10);
            if (!isNaN(from) && !isNaN(to)) {
                const lo = Math.max(bounds.minYear, Math.min(from, bounds.maxYear));
                const hi = Math.max(bounds.minYear, Math.min(to, bounds.maxYear));
                if (lo <= hi) return [lo, hi];
            }
        }
        return [bounds.minYear, bounds.maxYear];
    }, [searchParams, bounds, dateMode]);

    // Compute exact dateRange from URL
    const dateRange = useMemo((): [Date, Date] => {
        const dateFrom = searchParams.get("date_from");
        const dateTo = searchParams.get("date_to");
        if (dateFrom && dateTo && dateMode === "exact") {
            const start = new Date(dateFrom);
            const end = new Date(dateTo);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return [start, end];
            }
        }
        return [new Date(bounds.minYear, 0, 1), new Date(bounds.maxYear, 11, 31)];
    }, [searchParams, bounds, dateMode]);

    const displayedYearRange = useMemo((): [number, number] => {
        if (yearRangeDraft !== null) {
            const lo = Math.max(bounds.minYear, Math.min(yearRangeDraft[0], bounds.maxYear));
            const hi = Math.max(bounds.minYear, Math.min(yearRangeDraft[1], bounds.maxYear));
            if (lo <= hi) return [lo, hi];
        }
        return yearRange;
    }, [yearRangeDraft, yearRange, bounds]);

    useEffect(() => {
        if (!mobileOpen) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    // Debounce timer for year slider URL writes
    const yearDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateParam = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (value === null) {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }
            const qs = params.toString();
            router.replace(
                (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
            );
        },
        [searchParams, router, pathname]
    );

    const toggleTag = useCallback(
        (facetSlug: string, tagSlug: string) => {
            const params = new URLSearchParams(searchParams.toString());
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
            router.replace(
                (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
            );
        },
        [searchParams, router, pathname]
    );

    const handleYearRangeChange = useCallback(
        (range: [number, number]) => {
            setYearRangeDraft(range);
            if (yearDebounceRef.current) clearTimeout(yearDebounceRef.current);
            yearDebounceRef.current = setTimeout(() => {
                const isFullRange = range[0] === bounds.minYear && range[1] === bounds.maxYear;
                if (isFullRange) {
                    updateParam({ date_from: null, date_to: null });
                } else {
                    updateParam({
                        date_from: `${range[0]}-01-01`,
                        date_to: `${range[1]}-12-31`,
                    });
                }
            }, 400);
        },
        [bounds, updateParam]
    );

    const handleExactDateChange = useCallback(
        (start: Date, end: Date) => {
            const isFullRange =
                start.getTime() === minDate.getTime() && end.getTime() === maxDate.getTime();
            if (isFullRange) {
                updateParam({ date_from: null, date_to: null });
            } else {
                updateParam({
                    date_from: start.toISOString().slice(0, 10),
                    date_to: end.toISOString().slice(0, 10),
                });
            }
        },
        [minDate, maxDate, updateParam]
    );

    const switchToExact = useCallback(() => {
        updateParam({ date_mode: "exact" });
    }, [updateParam]);

    const switchToYear = useCallback(() => {
        // Convert current exact date range to year range, remove date_mode param
        const params = new URLSearchParams(searchParams.toString());
        params.delete("date_mode");
        // Keep date_from/date_to as year-based if already set
        const dateFrom = params.get("date_from");
        const dateTo = params.get("date_to");
        if (dateFrom && dateTo) {
            const from = parseInt(dateFrom.slice(0, 4), 10);
            const to = parseInt(dateTo.slice(0, 4), 10);
            if (!isNaN(from) && !isNaN(to)) {
                params.set("date_from", `${from}-01-01`);
                params.set("date_to", `${to}-12-31`);
            }
        }
        const qs = params.toString();
        router.replace(
            (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
        );
    }, [searchParams, router, pathname]);

    const toggleCategory = useCallback((cat: string) => {
        setCheckedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setCheckedCategories(new Set());
        setYearRangeDraft(null);
        // Strip all filter params, keep only q
        const params = new URLSearchParams();
        const q = searchParams.get("q");
        if (q) params.set("q", q);
        const qs = params.toString();
        router.replace(
            (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
        );
    }, [searchParams, router, pathname]);

    const hasActiveFilters = useMemo(() => {
        for (const facet of facetList) {
            if (searchParams.get(facet.slug)) return true;
        }
        return searchParams.has("date_from") || searchParams.has("date_to");
    }, [searchParams, facetList]);

    const sidebarContent = (
        <>
            <div className="mb-1 flex items-center justify-between px-4 py-3">
                <div>
                    <h2 className="font-display text-2xl leading-relaxed font-medium">
                        {t("title")}
                    </h2>
                    <div className="bg-foreground mt-1 h-0.5 w-10" />
                </div>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1 lg:hidden"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <FilterGroup label={t("categories.label")}>
                <div className="flex flex-wrap gap-2 pb-2.5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            aria-pressed={checkedCategories.has(cat)}
                            onClick={() => toggleCategory(cat)}
                            className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] uppercase transition-all ${
                                checkedCategories.has(cat)
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                        >
                            {t(`categories.${cat}`)}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            {facetList.map((facet) => (
                <FilterGroup key={facet.slug} label={getLabel(facet.translations, locale)}>
                    <div className="flex flex-wrap gap-2 pb-2.5">
                        {facet.tags.map((tag) => (
                            <button
                                key={tag.slug}
                                type="button"
                                aria-pressed={activeFacets[facet.slug]?.has(tag.slug) ?? false}
                                onClick={() => toggleTag(facet.slug, tag.slug)}
                                className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] uppercase transition-all ${
                                    activeFacets[facet.slug]?.has(tag.slug)
                                        ? "bg-foreground text-background border-foreground"
                                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                }`}
                            >
                                {getLabel(tag.translations, locale)}
                            </button>
                        ))}
                    </div>
                </FilterGroup>
            ))}

            <FilterGroup label={t("locations.label")}>
                <div className="flex flex-wrap gap-2 pb-2.5">
                    {locations.length > 0 ? (
                        locations.map((loc) => (
                            <button
                                key={loc.id}
                                type="button"
                                disabled
                                className="border-border text-muted-foreground cursor-not-allowed border px-2 py-1 font-mono text-[10px] tracking-[1.1px] uppercase opacity-40"
                            >
                                {loc.name ?? loc.address}
                            </button>
                        ))
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="border-border text-muted-foreground cursor-not-allowed border px-2 py-1 font-mono text-[10px] tracking-[1.1px] uppercase opacity-40"
                        >
                            De Vooruit
                        </button>
                    )}
                </div>
            </FilterGroup>

            {/* Date filter — tabs replace the section title */}
            <div className="border-border border-t pt-2.5 pr-5 pb-3 pl-4">
                <div className="mb-3.5 flex gap-5">
                    <ModeTab
                        label={t("year.rangeMode")}
                        active={dateMode === "year"}
                        onClick={switchToYear}
                    />
                    <ModeTab
                        label={t("year.exactMode")}
                        active={dateMode === "exact"}
                        onClick={switchToExact}
                    />
                </div>

                {dateMode === "year" && (
                    <>
                        <div className="text-foreground mb-3.5 flex justify-between font-mono text-[13px] select-text">
                            <span>{displayedYearRange[0]}</span>
                            <span className="text-muted-foreground text-[11px]">—</span>
                            <span>{displayedYearRange[1]}</span>
                        </div>
                        <YearRangeSlider
                            min={bounds.minYear}
                            max={bounds.maxYear}
                            value={displayedYearRange}
                            onChange={handleYearRangeChange}
                            ariaLabelStart={t("year.rangeFrom")}
                            ariaLabelEnd={t("year.rangeTo")}
                        />
                    </>
                )}

                {dateMode === "exact" && (
                    <div className="mt-5">
                        <DateRangePicker
                            startDate={dateRange[0]}
                            endDate={dateRange[1]}
                            minDate={minDate}
                            maxDate={maxDate}
                            onChange={handleExactDateChange}
                        />
                    </div>
                )}
            </div>

            <button
                onClick={clearAll}
                className={`border-foreground text-foreground hover:bg-foreground hover:text-background mx-auto mt-4 block w-[calc(100%-40px)] max-w-[230px] cursor-pointer border bg-transparent px-4 py-[9px] font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all ${
                    !hasActiveFilters && checkedCategories.size === 0 ? "opacity-40" : ""
                }`}
            >
                {t("clearAll")}
            </button>
        </>
    );

    return (
        <>
            <button
                onClick={() => setMobileOpen(true)}
                className="border-border text-muted-foreground hover:text-foreground bg-background fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-2 border px-4 py-2.5 font-mono text-[10px] tracking-[1.4px] uppercase shadow-lg transition-colors lg:hidden"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("title")}
            </button>

            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`border-border shrink-0 overflow-x-hidden border-r py-5 pb-10 ${
                    mobileOpen
                        ? "bg-background fixed inset-y-0 left-0 z-50 w-[290px] overflow-y-auto shadow-xl"
                        : "hidden lg:sticky lg:top-[var(--results-bar-height,41px)] lg:block lg:max-h-[calc(100vh-var(--results-bar-height,41px))] lg:w-[290px] lg:overflow-y-auto"
                }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}

function ModeTab({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer border-b-2 pb-1 font-mono text-[11px] font-medium tracking-[1.2px] uppercase transition-all ${
                active
                    ? "border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
        >
            {label}
        </button>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="border-border border-t px-5 py-2.5 pl-4">
            <span className="text-foreground mb-2.5 block font-mono text-[11px] font-medium tracking-[1.2px] uppercase">
                {label}
            </span>
            {children}
        </div>
    );
}
